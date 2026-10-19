"""Regras de negócio, progresso, mini-quizzes e certificados da Zaeron Academy."""

import copy
from dataclasses import dataclass
import datetime
from functools import lru_cache
import json
from pathlib import Path
import re
import secrets
from typing import Any, Iterable, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from api.zaeron_api.core.errors import APIError
from api.zaeron_api.models.users import User
from api.zaeron_api.repositories.academy import (
    AcademyAPIRepository,
    AcademyRepository,
)
from api.zaeron_api.schemas.academy import (
    AcademyCertificateResponse,
    AcademyCourseResponse,
    AcademyLessonResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from api.zaeron_api.services.certificate import (
    build_certificate_share_url,
    generate_public_code,
)

_CONTENT_ROOT = Path(__file__).resolve().parents[1] / "content"
_FALLBACK_CONTENT_ROOT = (
    Path(__file__).resolve().parents[3] / "app" / "academy" / "content"
)

_COURSE_DIRECTORIES = {
    "ia_rotina_contabil": _CONTENT_ROOT / "ia_rotina_contabil"
    if (_CONTENT_ROOT / "ia_rotina_contabil").exists()
    else _FALLBACK_CONTENT_ROOT / "ia_rotina_contabil"
}

_PUBLIC_CODE_PATTERN = re.compile(
    r"^ZAC-[23456789A-HJ-NP-Z]{4}(?:-[23456789A-HJ-NP-Z]{4}){3}$"
)

LESSON_PASSING_SCORE = 60.0
FINAL_PASSING_SCORE = 70.0


@lru_cache(maxsize=4)
def load_course(course_key: str = "ia_rotina_contabil") -> dict:
    """Carrega conteúdo em cache sem depender da camada de interface."""
    course_root = _COURSE_DIRECTORIES.get(course_key)
    if course_root is None or not course_root.exists():
        # Fallback check
        fallback = _CONTENT_ROOT / course_key
        if fallback.exists():
            course_root = fallback
        else:
            fallback2 = _FALLBACK_CONTENT_ROOT / course_key
            if fallback2.exists():
                course_root = fallback2
            else:
                raise KeyError(f"Curso desconhecido: {course_key}")

    manifest_path = course_root / "course.json"
    course = json.loads(manifest_path.read_text(encoding="utf-8"))

    if course.get("course_key") != course_key:
        raise ValueError(
            "course_key do manifesto não corresponde ao diretório solicitado."
        )

    root_resolved = course_root.resolve()
    lesson_keys = set()
    for module in course.get("modules", []):
        for lesson in module.get("lessons", []):
            lesson_key = lesson.get("lesson_key")
            if not lesson_key or lesson_key in lesson_keys:
                raise ValueError(
                    "lesson_key ausente ou duplicada no manifesto."
                )
            lesson_keys.add(lesson_key)

            questions = lesson.get("questions")
            if not isinstance(questions, list) or len(questions) != 5:
                raise ValueError(
                    f"A aula {lesson_key} deve conter exatamente 5 perguntas."
                )

            passing_score = lesson.get("passing_score", LESSON_PASSING_SCORE)
            if not isinstance(passing_score, (int, float)) or passing_score <= 0:
                raise ValueError(f"passing_score inválido na aula {lesson_key}.")

            question_keys = set()
            for question in questions:
                question_key = question.get("question_key")
                options = question.get("options")
                if (
                    not question_key
                    or question_key in question_keys
                    or not isinstance(options, dict)
                    or len(options) != 4
                    or not str(question.get("prompt", "")).strip()
                    or question.get("correct_option") not in options
                    or not str(question.get("explanation", "")).strip()
                ):
                    raise ValueError(f"Pergunta inválida na aula {lesson_key}.")
                question_keys.add(question_key)

            lesson_path = (course_root / lesson["content_path"]).resolve()
            if not lesson_path.is_relative_to(root_resolved):
                raise ValueError("Caminho de aula fora do diretório do curso.")
            lesson["content_markdown"] = lesson_path.read_text(encoding="utf-8")
            lesson["module_key"] = module.get("module_key")
            lesson["module_title"] = module.get("title")

    return copy.deepcopy(course)


def ordered_lessons(course: dict) -> list[dict]:
    lessons = []
    for module in sorted(
        course.get("modules", []), key=lambda item: item["order"]
    ):
        for lesson in sorted(
            module.get("lessons", []), key=lambda item: item["order"]
        ):
            lessons.append(lesson)
    return lessons


def get_lesson(course: dict, lesson_key: str) -> dict:
    for lesson in ordered_lessons(course):
        if lesson["lesson_key"] == lesson_key:
            return lesson
    raise KeyError(f"Aula não encontrada: {lesson_key}")


def calculate_progress(
    course: dict,
    completed_lesson_keys: Iterable[str],
) -> dict:
    lessons = ordered_lessons(course)
    total_lessons = len(lessons)
    if total_lessons == 0:
        return {
            "total_lessons": 0,
            "completed_lessons": 0,
            "percentage": 100.0,
            "is_complete": True,
            "completed_lesson_keys": set(),
        }

    known_keys = {lesson["lesson_key"] for lesson in lessons}
    completed_set = {
        key for key in completed_lesson_keys if key in known_keys
    }
    completed_count = len(completed_set)
    percentage = round((completed_count / total_lessons) * 100, 2)
    return {
        "total_lessons": total_lessons,
        "completed_lessons": completed_count,
        "percentage": percentage,
        "is_complete": completed_count == total_lessons,
        "completed_lesson_keys": completed_set,
    }


def get_continue_destination(
    course: dict,
    completed_lesson_keys: Iterable[str],
) -> dict:
    progress = calculate_progress(course, completed_lesson_keys)
    completed_set = progress["completed_lesson_keys"]
    for lesson in ordered_lessons(course):
        if lesson["lesson_key"] not in completed_set:
            return {"kind": "lesson", "lesson_key": lesson["lesson_key"]}
    return {"kind": "quiz", "lesson_key": None}


def normalize_public_code(public_code: Optional[str]) -> Optional[str]:
    raw = str(public_code or "").strip().upper()
    return raw if _PUBLIC_CODE_PATTERN.fullmatch(raw) else None


@dataclass(frozen=True)
class PublicCertificateSnapshot:
    public_code: str
    recipient_name: str
    course_title: str
    course_version: str
    duration_minutes: int
    issued_at: datetime.datetime
    status: str
    verification_url: str


class CertificateValidationService:
    def __init__(self, repository: AcademyRepository):
        self.repository = repository

    def validate(
        self, public_code: str, base_url: Optional[str] = None
    ) -> Optional[PublicCertificateSnapshot]:
        normalized = normalize_public_code(public_code)
        if normalized is None:
            return None

        certificate = self.repository.get_certificate_by_public_code(normalized)
        if certificate is None:
            return None

        try:
            course = load_course(certificate.course_key)
            duration = int(course["estimated_duration_minutes"])
        except Exception:
            duration = 0

        status = "revoked" if certificate.revoked_at else "valid"
        share_url = build_certificate_share_url(
            certificate.public_code, base_url=base_url
        )
        return PublicCertificateSnapshot(
            public_code=certificate.public_code,
            recipient_name=certificate.recipient_name,
            course_title=certificate.course_title,
            course_version=certificate.course_version,
            duration_minutes=duration,
            issued_at=certificate.issued_at,
            status=status,
            verification_url=share_url,
        )


@dataclass(frozen=True)
class LessonQuizResult:
    attempt_id: int
    attempt_token: str
    lesson_key: str
    total_questions: int
    correct_answers: int
    score: float
    passed: bool
    is_new_attempt: bool


@dataclass(frozen=True)
class QuizResult:
    attempt_id: int
    attempt_token: str
    total_questions: int
    correct_answers: int
    score: float
    passed: bool
    is_new_attempt: bool
    certificate_id: Optional[int] = None
    certificate_code: Optional[str] = None


class AcademyService:
    def __init__(
        self,
        repository: AcademyRepository,
        course_key: str = "ia_rotina_contabil",
    ):
        self.repository = repository
        self.course = load_course(course_key)

    @property
    def course_key(self) -> str:
        return self.course["course_key"]

    @property
    def course_version(self) -> str:
        return self.course["version"]

    def get_user_progress(self, user_id: int) -> dict:
        completed = self.repository.list_completed_lesson_keys(
            user_id,
            self.course_key,
            self.course_version,
        )
        return calculate_progress(self.course, completed)

    def get_continue_destination(self, user_id: int) -> dict:
        progress = self.get_user_progress(user_id)
        return get_continue_destination(
            self.course,
            progress["completed_lesson_keys"],
        )

    def is_lesson_unlocked(self, user_id: int, lesson_key: str) -> bool:
        lessons = ordered_lessons(self.course)
        lesson_index = next(
            (
                index
                for index, lesson in enumerate(lessons)
                if lesson["lesson_key"] == lesson_key
            ),
            None,
        )
        if lesson_index is None:
            raise KeyError(f"Aula desconhecida: {lesson_key}")
        completed = self.get_user_progress(user_id)["completed_lesson_keys"]
        return all(
            lesson["lesson_key"] in completed
            for lesson in lessons[:lesson_index]
        )

    def access_lesson(self, user_id: int, lesson_key: str):
        get_lesson(self.course, lesson_key)
        if not self.is_lesson_unlocked(user_id, lesson_key):
            raise ValueError(
                "Conclua as aulas anteriores para acessar esta aula."
            )
        return self.repository.upsert_lesson_progress(
            user_id,
            self.course_key,
            self.course_version,
            lesson_key,
        )

    def complete_lesson(self, user_id: int, lesson_key: str):
        raise ValueError(
            "A aula só pode ser concluída por aprovação no mini-quiz."
        )

    def submit_lesson_quiz(
        self,
        *,
        user_id: int,
        lesson_key: str,
        answers: dict[str, str],
        attempt_token: Optional[str] = None,
    ) -> LessonQuizResult:
        lesson = get_lesson(self.course, lesson_key)
        if not self.is_lesson_unlocked(user_id, lesson_key):
            raise ValueError(
                "Conclua as aulas anteriores antes de enviar este mini-quiz."
            )

        token = (attempt_token or secrets.token_urlsafe(24)).strip()
        if not token:
            raise ValueError("attempt_token inválido.")

        existing = self.repository.get_lesson_quiz_attempt_by_token(token)
        if existing is not None:
            attempt = existing
            is_new_attempt = False
        else:
            questions = lesson["questions"]
            normalized_answers = {
                question["question_key"]: str(
                    answers.get(question["question_key"], "")
                )
                for question in questions
            }
            correct = sum(
                normalized_answers[question["question_key"]]
                == question["correct_option"]
                for question in questions
            )
            total = len(questions)
            score = round((correct / total * 100), 2) if total else 0.0
            passed = score >= float(lesson["passing_score"])
            attempt, is_new_attempt = (
                self.repository.record_lesson_quiz_attempt(
                    user_id=user_id,
                    course_key=self.course_key,
                    course_version=self.course_version,
                    lesson_key=lesson_key,
                    attempt_token=token,
                    total_questions=total,
                    correct_answers=correct,
                    score=score,
                    passed=passed,
                    answers_json=json.dumps(
                        normalized_answers,
                        ensure_ascii=False,
                        sort_keys=True,
                    ),
                )
            )

        if (
            attempt.user_id != user_id
            or attempt.course_key != self.course_key
            or attempt.course_version != self.course_version
            or attempt.lesson_key != lesson_key
        ):
            raise ValueError("attempt_token já pertence a outra tentativa.")

        return LessonQuizResult(
            attempt_id=attempt.id,
            attempt_token=attempt.attempt_token,
            lesson_key=attempt.lesson_key,
            total_questions=attempt.total_questions,
            correct_answers=attempt.correct_answers,
            score=float(attempt.score),
            passed=bool(attempt.passed),
            is_new_attempt=is_new_attempt,
        )

    def submit_quiz(
        self,
        *,
        user_id: int,
        recipient_name: str,
        answers: dict[str, str],
        attempt_token: Optional[str] = None,
    ) -> QuizResult:
        progress = self.get_user_progress(user_id)
        if not progress["is_complete"]:
            raise ValueError(
                "Conclua todas as aulas antes de enviar o quiz final."
            )

        token = (attempt_token or secrets.token_urlsafe(24)).strip()
        if not token:
            raise ValueError("attempt_token inválido.")

        existing = self.repository.get_quiz_attempt_by_token(token)
        if existing is not None:
            attempt = existing
            is_new_attempt = False
        else:
            questions = self.course["quiz"]["questions"]
            normalized_answers = {
                question["question_key"]: str(
                    answers.get(question["question_key"], "")
                )
                for question in questions
            }
            correct = sum(
                normalized_answers[question["question_key"]]
                == question["correct_option"]
                for question in questions
            )
            total = len(questions)
            score = round((correct / total * 100), 2) if total else 0.0
            passed = score >= float(self.course["passing_score"])
            attempt, is_new_attempt = self.repository.record_quiz_attempt(
                user_id=user_id,
                course_key=self.course_key,
                course_version=self.course_version,
                attempt_token=token,
                total_questions=total,
                correct_answers=correct,
                score=score,
                passed=passed,
                answers_json=json.dumps(
                    normalized_answers, ensure_ascii=False, sort_keys=True
                ),
            )

        if (
            attempt.user_id != user_id
            or attempt.course_key != self.course_key
            or attempt.course_version != self.course_version
        ):
            raise ValueError("attempt_token já pertence a outra tentativa.")

        certificate = None
        if attempt.passed:
            certificate, _ = self.repository.issue_certificate(
                user_id=user_id,
                attempt_id=attempt.id,
                course_key=self.course_key,
                course_version=self.course_version,
                recipient_name=recipient_name,
                course_title=self.course["title"],
                score=float(attempt.score),
            )

        return QuizResult(
            attempt_id=attempt.id,
            attempt_token=attempt.attempt_token,
            total_questions=attempt.total_questions,
            correct_answers=attempt.correct_answers,
            score=float(attempt.score),
            passed=bool(attempt.passed),
            is_new_attempt=is_new_attempt,
            certificate_id=certificate.id if certificate else None,
            certificate_code=certificate.public_code if certificate else None,
        )


def _safe_question(question: dict) -> dict:
    """Whitelist explícita: respostas e explicações não saem antes da correção."""
    return {
        "question_key": str(question["question_key"]),
        "prompt": str(question["prompt"]),
        "options": {
            str(key): str(value) for key, value in question["options"].items()
        },
    }


class AcademyAPIService:
    def __init__(
        self, session: Session, course_key: str = "ia_rotina_contabil"
    ):
        self.session = session
        self.repository = AcademyAPIRepository(session)
        self.course = load_course(course_key)
        self.lessons = ordered_lessons(self.course)

    def _completed(self, user_id: int) -> set[str]:
        return self.repository.completed_lesson_keys(
            user_id, self.course["course_key"], self.course["version"]
        )

    def _is_unlocked(self, lesson_key: str, completed: set[str]) -> bool:
        index = next(
            (
                index
                for index, item in enumerate(self.lessons)
                if item["lesson_key"] == lesson_key
            ),
            None,
        )
        if index is None:
            raise APIError(404, "Aula não encontrada.", "lesson_not_found")
        return all(
            item["lesson_key"] in completed for item in self.lessons[:index]
        )

    def course_manifest(self, user_id: int) -> AcademyCourseResponse:
        completed = self._completed(user_id)
        accessed = {
            row.lesson_key
            for row in self.repository.list_progress(
                user_id, self.course["course_key"], self.course["version"]
            )
        }
        attempts = self.repository.list_lesson_attempts(
            user_id, self.course["course_key"], self.course["version"]
        )
        latest_attempts: dict[str, Any] = {}
        for att in attempts:
            if att.lesson_key not in latest_attempts:
                latest_attempts[att.lesson_key] = att
            elif att.passed and not latest_attempts[att.lesson_key].passed:
                latest_attempts[att.lesson_key] = att

        modules = []
        for module in sorted(
            self.course["modules"], key=lambda item: item["order"]
        ):
            lessons = []
            for lesson in sorted(
                module["lessons"], key=lambda item: item["order"]
            ):
                key = lesson["lesson_key"]
                unlocked = self._is_unlocked(key, completed)
                status = (
                    "completed"
                    if key in completed
                    else "in_progress"
                    if key in accessed and unlocked
                    else "locked"
                    if not unlocked
                    else "in_progress"
                )
                att = latest_attempts.get(key)
                lesson_score = float(att.score) if att is not None else None
                lesson_passed = bool(att.passed) if att is not None else None

                lessons.append(
                    {
                        "lesson_key": key,
                        "title": lesson["title"],
                        "order": lesson["order"],
                        "estimated_minutes": lesson["estimated_minutes"],
                        "passing_score": LESSON_PASSING_SCORE,
                        "status": status,
                        "is_unlocked": unlocked,
                        "score": lesson_score,
                        "passed": lesson_passed,
                    }
                )

            modules.append(
                {
                    "module_key": module["module_key"],
                    "title": module["title"],
                    "description": module["description"],
                    "order": module["order"],
                    "lessons": lessons,
                }
            )

        complete = len(completed) == len(self.lessons)
        next_key = next(
            (
                lesson["lesson_key"]
                for lesson in self.lessons
                if lesson["lesson_key"] not in completed
            ),
            None,
        )
        return AcademyCourseResponse(
            course_key=self.course["course_key"],
            version=self.course["version"],
            title=self.course["title"],
            description=self.course["description"],
            estimated_duration_minutes=int(
                self.course["estimated_duration_minutes"]
            ),
            modules=modules,
            progress={
                "total_lessons": len(self.lessons),
                "completed_lessons": len(completed),
                "percentage": round(len(completed) / len(self.lessons) * 100, 2)
                if self.lessons
                else 100.0,
                "is_complete": complete,
                "continue_lesson_key": next_key,
            },
            final_quiz={
                "quiz_key": self.course["quiz"]["quiz_key"],
                "title": self.course["quiz"]["title"],
                "passing_score": FINAL_PASSING_SCORE,
                "is_unlocked": complete,
                "questions": [
                    _safe_question(question)
                    for question in self.course["quiz"]["questions"]
                ]
                if complete
                else [],
            },
        )

    def access_lesson(
        self, user_id: int, lesson_key: str
    ) -> AcademyLessonResponse:
        try:
            lesson = get_lesson(self.course, lesson_key)
        except KeyError as exc:
            raise APIError(
                404, "Aula não encontrada.", "lesson_not_found"
            ) from exc
        completed = self._completed(user_id)
        if not self._is_unlocked(lesson_key, completed):
            raise APIError(
                409,
                "Conclua as aulas anteriores para acessar esta aula.",
                "lesson_locked",
            )
        self.repository.access_lesson(
            user_id,
            self.course["course_key"],
            self.course["version"],
            lesson_key,
        )
        self.session.commit()
        return AcademyLessonResponse(
            lesson_key=lesson["lesson_key"],
            module_key=lesson["module_key"],
            module_title=lesson["module_title"],
            title=lesson["title"],
            estimated_minutes=lesson["estimated_minutes"],
            passing_score=LESSON_PASSING_SCORE,
            content_markdown=lesson["content_markdown"],
            questions=[
                _safe_question(question) for question in lesson["questions"]
            ],
        )

    @staticmethod
    def _grade(questions: list[dict], answers: dict[str, str]):
        normalized = {
            question["question_key"]: str(
                answers.get(question["question_key"], "")
            )
            for question in questions
        }
        correct = sum(
            normalized[question["question_key"]] == question["correct_option"]
            for question in questions
        )
        score = round(correct / len(questions) * 100, 2) if questions else 0.0
        return normalized, correct, score

    @staticmethod
    def _feedback(questions: list[dict], answers: dict[str, str]) -> list[dict]:
        return [
            {
                "question_key": question["question_key"],
                "correct": answers.get(question["question_key"], "")
                == question["correct_option"],
                "explanation": question["explanation"],
            }
            for question in questions
        ]

    def submit(
        self, user: User, payload: QuizSubmitRequest
    ) -> QuizSubmitResponse:
        if payload.kind == "lesson":
            return self._submit_lesson(user.id, payload)
        return self._submit_final(user, payload)

    def _submit_lesson(self, user_id: int, payload: QuizSubmitRequest):
        lesson_key = payload.lesson_key or ""
        try:
            lesson = get_lesson(self.course, lesson_key)
        except KeyError as exc:
            raise APIError(
                404, "Aula não encontrada.", "lesson_not_found"
            ) from exc
        if not self._is_unlocked(lesson_key, self._completed(user_id)):
            raise APIError(409, "Mini-quiz bloqueado.", "lesson_locked")

        existing = self.repository.lesson_attempt_by_token(payload.attempt_token)
        is_new = existing is None
        if existing is not None:
            if (
                existing.user_id != user_id
                or existing.course_key != self.course["course_key"]
                or existing.course_version != self.course["version"]
                or existing.lesson_key != lesson_key
            ):
                raise APIError(
                    409,
                    "Token de tentativa já utilizado.",
                    "attempt_token_conflict",
                )
            attempt = existing
            normalized = json.loads(attempt.answers_json)
        else:
            normalized, correct, score = self._grade(
                lesson["questions"], payload.answers
            )
            passed = score >= LESSON_PASSING_SCORE
            now = datetime.datetime.utcnow()
            progress = self.repository.access_lesson(
                user_id,
                self.course["course_key"],
                self.course["version"],
                lesson_key,
            )
            if passed and progress.completed_at is None:
                progress.completed_at = now
            attempt = self.repository.add_lesson_attempt(
                user_id=user_id,
                course_key=self.course["course_key"],
                course_version=self.course["version"],
                lesson_key=lesson_key,
                attempt_token=payload.attempt_token,
                total_questions=len(lesson["questions"]),
                correct_answers=correct,
                score=score,
                passed=passed,
                answers_json=json.dumps(
                    normalized, ensure_ascii=False, sort_keys=True
                ),
                submitted_at=now,
            )
            self._commit_idempotent()

        completed = self._completed(user_id)
        next_key = next(
            (
                item["lesson_key"]
                for item in self.lessons
                if item["lesson_key"] not in completed
            ),
            None,
        )
        return QuizSubmitResponse(
            kind="lesson",
            lesson_key=lesson_key,
            attempt_token=attempt.attempt_token,
            score=float(attempt.score),
            passing_score=LESSON_PASSING_SCORE,
            passed=bool(attempt.passed),
            is_new_attempt=is_new,
            feedback=self._feedback(lesson["questions"], normalized),
            next_lesson_key=next_key,
        )

    def _submit_final(self, user: User, payload: QuizSubmitRequest):
        if len(self._completed(user.id)) != len(self.lessons):
            raise APIError(
                409,
                "Conclua todas as aulas antes do quiz final.",
                "quiz_locked",
            )
        questions = self.course["quiz"]["questions"]
        existing = self.repository.final_attempt_by_token(payload.attempt_token)
        is_new = existing is None
        if existing is not None:
            if (
                existing.user_id != user.id
                or existing.course_key != self.course["course_key"]
                or existing.course_version != self.course["version"]
            ):
                raise APIError(
                    409,
                    "Token de tentativa já utilizado.",
                    "attempt_token_conflict",
                )
            attempt = existing
            normalized = json.loads(attempt.answers_json)
        else:
            normalized, correct, score = self._grade(
                questions, payload.answers
            )
            passed = score >= FINAL_PASSING_SCORE
            attempt = self.repository.add_final_attempt(
                user_id=user.id,
                course_key=self.course["course_key"],
                course_version=self.course["version"],
                attempt_token=payload.attempt_token,
                total_questions=len(questions),
                correct_answers=correct,
                score=score,
                passed=passed,
                answers_json=json.dumps(
                    normalized, ensure_ascii=False, sort_keys=True
                ),
                submitted_at=datetime.datetime.utcnow(),
            )

        certificate = self.repository.certificate_for_course(
            user.id, self.course["course_key"], self.course["version"]
        )
        if bool(attempt.passed) and certificate is None:
            self.session.flush()
            certificate = self.repository.add_certificate(
                user_id=user.id,
                attempt_id=attempt.id,
                public_code=generate_public_code(),
                course_key=self.course["course_key"],
                course_version=self.course["version"],
                recipient_name=user.name.strip(),
                course_title=self.course["title"],
                score=float(attempt.score),
                issued_at=datetime.datetime.utcnow(),
            )
        if is_new or certificate is not None and certificate.id is None:
            self._commit_idempotent()

        return QuizSubmitResponse(
            kind="final",
            lesson_key=None,
            attempt_token=attempt.attempt_token,
            score=float(attempt.score),
            passing_score=FINAL_PASSING_SCORE,
            passed=bool(attempt.passed),
            is_new_attempt=is_new,
            feedback=self._feedback(questions, normalized),
            certificate_id=certificate.id if certificate else None,
            certificate_code=certificate.public_code if certificate else None,
        )

    def _commit_idempotent(self):
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise APIError(
                409,
                "Tentativa concorrente detectada; consulte novamente.",
                "attempt_conflict",
            ) from exc

    def certificates(self, user_id: int) -> list[AcademyCertificateResponse]:
        return [
            self._certificate_response(item)
            for item in self.repository.list_certificates(user_id)
        ]

    def certificate(
        self, user_id: int, certificate_id: int
    ) -> AcademyCertificateResponse:
        certificate = self.repository.get_certificate(user_id, certificate_id)
        if certificate is None:
            raise APIError(
                404, "Certificado não encontrado.", "certificate_not_found"
            )
        return self._certificate_response(certificate)

    def _certificate_response(self, certificate) -> AcademyCertificateResponse:
        return AcademyCertificateResponse(
            id=certificate.id,
            status="revoked" if certificate.revoked_at else "valid",
            public_code=certificate.public_code,
            recipient_name=certificate.recipient_name,
            course_title=certificate.course_title,
            course_version=certificate.course_version,
            score=float(certificate.score),
            duration_minutes=int(self.course["estimated_duration_minutes"]),
            issued_at=certificate.issued_at,
            validation_path=f"/?certificado={certificate.public_code}",
        )


__all__ = [
    "AcademyService",
    "AcademyAPIService",
    "CertificateValidationService",
    "PublicCertificateSnapshot",
    "LessonQuizResult",
    "QuizResult",
    "calculate_progress",
    "get_continue_destination",
    "get_lesson",
    "load_course",
    "normalize_public_code",
    "ordered_lessons",
    "FINAL_PASSING_SCORE",
    "LESSON_PASSING_SCORE",
]
