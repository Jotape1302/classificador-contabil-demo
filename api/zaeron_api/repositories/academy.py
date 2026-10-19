"""Persistência de dados e repositórios da Zaeron Academy."""

import contextlib
import datetime
from typing import Callable, Optional

from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from api.zaeron_api.models.academy import (
    AcademyCertificate,
    AcademyLessonProgress,
    AcademyLessonQuizAttempt,
    AcademyQuizAttempt,
)


class AcademyRepository:
    """Repositório transacional da Academy compatível com session_factory e Session."""

    def __init__(self, session_factory):
        self.session_factory = session_factory

    @contextlib.contextmanager
    def _session(self):
        if isinstance(self.session_factory, Session):
            yield self.session_factory
        elif callable(self.session_factory):
            session = self.session_factory()
            try:
                yield session
            finally:
                session.close()
        else:
            raise TypeError("session_factory inválido.")

    def upsert_lesson_progress(
        self,
        user_id: int,
        course_key: str,
        course_version: str,
        lesson_key: str,
        accessed_at: Optional[datetime.datetime] = None,
    ) -> AcademyLessonProgress:
        now = accessed_at or datetime.datetime.utcnow()
        with self._session() as session:
            progress = (
                session.query(AcademyLessonProgress)
                .filter_by(
                    user_id=user_id,
                    course_key=course_key,
                    course_version=course_version,
                    lesson_key=lesson_key,
                )
                .first()
            )
            if progress is None:
                progress = AcademyLessonProgress(
                    user_id=user_id,
                    course_key=course_key,
                    course_version=course_version,
                    lesson_key=lesson_key,
                    started_at=now,
                    last_accessed_at=now,
                )
                session.add(progress)
            else:
                progress.last_accessed_at = now

            try:
                session.commit()
            except IntegrityError:
                session.rollback()
                progress = (
                    session.query(AcademyLessonProgress)
                    .filter_by(
                        user_id=user_id,
                        course_key=course_key,
                        course_version=course_version,
                        lesson_key=lesson_key,
                    )
                    .first()
                )
                if progress is not None:
                    progress.last_accessed_at = now
                    session.commit()
                else:
                    raise
            return progress

    def get_lesson_progress(
        self,
        user_id: int,
        course_key: str,
        course_version: str,
        lesson_key: str,
    ) -> Optional[AcademyLessonProgress]:
        with self._session() as session:
            return (
                session.query(AcademyLessonProgress)
                .filter_by(
                    user_id=user_id,
                    course_key=course_key,
                    course_version=course_version,
                    lesson_key=lesson_key,
                )
                .first()
            )

    def list_progress(
        self,
        user_id: int,
        course_key: str,
        course_version: str,
    ) -> list[AcademyLessonProgress]:
        with self._session() as session:
            return (
                session.query(AcademyLessonProgress)
                .filter_by(
                    user_id=user_id,
                    course_key=course_key,
                    course_version=course_version,
                )
                .order_by(AcademyLessonProgress.started_at.asc())
                .all()
            )

    def list_completed_lesson_keys(
        self,
        user_id: int,
        course_key: str,
        course_version: str,
    ) -> set[str]:
        with self._session() as session:
            rows = (
                session.query(AcademyLessonProgress.lesson_key)
                .join(
                    AcademyLessonQuizAttempt,
                    and_(
                        AcademyLessonQuizAttempt.user_id
                        == AcademyLessonProgress.user_id,
                        AcademyLessonQuizAttempt.course_key
                        == AcademyLessonProgress.course_key,
                        AcademyLessonQuizAttempt.course_version
                        == AcademyLessonProgress.course_version,
                        AcademyLessonQuizAttempt.lesson_key
                        == AcademyLessonProgress.lesson_key,
                    ),
                )
                .filter(
                    AcademyLessonProgress.user_id == user_id,
                    AcademyLessonProgress.course_key == course_key,
                    AcademyLessonProgress.course_version == course_version,
                    AcademyLessonProgress.completed_at.isnot(None),
                    AcademyLessonQuizAttempt.passed.is_(True),
                )
                .distinct()
                .all()
            )
            return {row[0] for row in rows}

    def get_lesson_quiz_attempt_by_token(
        self,
        attempt_token: str,
    ) -> Optional[AcademyLessonQuizAttempt]:
        with self._session() as session:
            return (
                session.query(AcademyLessonQuizAttempt)
                .filter_by(attempt_token=attempt_token)
                .first()
            )

    def record_lesson_quiz_attempt(
        self,
        *,
        user_id: int,
        course_key: str,
        course_version: str,
        lesson_key: str,
        attempt_token: str,
        total_questions: int,
        correct_answers: int,
        score: float,
        passed: bool,
        answers_json: str,
        submitted_at: Optional[datetime.datetime] = None,
    ) -> tuple[AcademyLessonQuizAttempt, bool]:
        now = submitted_at or datetime.datetime.utcnow()
        with self._session() as session:
            existing = (
                session.query(AcademyLessonQuizAttempt)
                .filter_by(attempt_token=attempt_token)
                .first()
            )
            if existing is not None:
                return existing, False

            attempt = AcademyLessonQuizAttempt(
                user_id=user_id,
                course_key=course_key,
                course_version=course_version,
                lesson_key=lesson_key,
                attempt_token=attempt_token,
                total_questions=total_questions,
                correct_answers=correct_answers,
                score=score,
                passed=passed,
                answers_json=answers_json,
                submitted_at=now,
            )
            session.add(attempt)

            if passed:
                progress = (
                    session.query(AcademyLessonProgress)
                    .filter_by(
                        user_id=user_id,
                        course_key=course_key,
                        course_version=course_version,
                        lesson_key=lesson_key,
                    )
                    .first()
                )
                if progress is None:
                    progress = AcademyLessonProgress(
                        user_id=user_id,
                        course_key=course_key,
                        course_version=course_version,
                        lesson_key=lesson_key,
                        started_at=now,
                        last_accessed_at=now,
                    )
                    session.add(progress)
                progress.last_accessed_at = now
                if progress.completed_at is None:
                    progress.completed_at = now

            try:
                session.commit()
                return attempt, True
            except IntegrityError:
                session.rollback()
                existing = (
                    session.query(AcademyLessonQuizAttempt)
                    .filter_by(attempt_token=attempt_token)
                    .first()
                )
                if existing is not None:
                    return existing, False
                raise

    def get_quiz_attempt_by_token(
        self,
        attempt_token: str,
    ) -> Optional[AcademyQuizAttempt]:
        with self._session() as session:
            return (
                session.query(AcademyQuizAttempt)
                .filter_by(attempt_token=attempt_token)
                .first()
            )

    def record_quiz_attempt(
        self,
        *,
        user_id: int,
        course_key: str,
        course_version: str,
        attempt_token: str,
        total_questions: int,
        correct_answers: int,
        score: float,
        passed: bool,
        answers_json: str,
        submitted_at: Optional[datetime.datetime] = None,
    ) -> tuple[AcademyQuizAttempt, bool]:
        with self._session() as session:
            existing = (
                session.query(AcademyQuizAttempt)
                .filter_by(attempt_token=attempt_token)
                .first()
            )
            if existing is not None:
                return existing, False

            attempt = AcademyQuizAttempt(
                user_id=user_id,
                course_key=course_key,
                course_version=course_version,
                attempt_token=attempt_token,
                total_questions=total_questions,
                correct_answers=correct_answers,
                score=score,
                passed=passed,
                answers_json=answers_json,
                submitted_at=submitted_at or datetime.datetime.utcnow(),
            )
            session.add(attempt)
            try:
                session.commit()
                return attempt, True
            except IntegrityError:
                session.rollback()
                existing = (
                    session.query(AcademyQuizAttempt)
                    .filter_by(attempt_token=attempt_token)
                    .first()
                )
                if existing is not None:
                    return existing, False
                raise

    def get_certificate(
        self,
        user_id: int,
        course_key: str,
        course_version: str,
    ) -> Optional[AcademyCertificate]:
        with self._session() as session:
            return (
                session.query(AcademyCertificate)
                .filter_by(
                    user_id=user_id,
                    course_key=course_key,
                    course_version=course_version,
                )
                .first()
            )

    def get_certificate_by_public_code(
        self,
        public_code: str,
    ) -> Optional[AcademyCertificate]:
        with self._session() as session:
            return (
                session.query(AcademyCertificate)
                .filter_by(public_code=public_code)
                .first()
            )

    def list_certificates(self, user_id: int) -> list[AcademyCertificate]:
        with self._session() as session:
            return (
                session.query(AcademyCertificate)
                .filter_by(user_id=user_id)
                .order_by(AcademyCertificate.issued_at.desc())
                .all()
            )

    def issue_certificate(
        self,
        *,
        user_id: int,
        attempt_id: int,
        course_key: str,
        course_version: str,
        recipient_name: str,
        course_title: str,
        score: float,
        code_factory: Optional[Callable[[], str]] = None,
        issued_at: Optional[datetime.datetime] = None,
    ) -> tuple[AcademyCertificate, bool]:
        if code_factory is None:
            from api.zaeron_api.services.certificate import generate_public_code

            code_factory = generate_public_code

        for _ in range(10):
            with self._session() as session:
                existing = (
                    session.query(AcademyCertificate)
                    .filter_by(
                        user_id=user_id,
                        course_key=course_key,
                        course_version=course_version,
                    )
                    .first()
                )
                if existing is not None:
                    return existing, False

                certificate = AcademyCertificate(
                    user_id=user_id,
                    attempt_id=attempt_id,
                    public_code=code_factory(),
                    course_key=course_key,
                    course_version=course_version,
                    recipient_name=recipient_name.strip(),
                    course_title=course_title.strip(),
                    score=score,
                    issued_at=issued_at or datetime.datetime.utcnow(),
                )
                session.add(certificate)
                try:
                    session.commit()
                    return certificate, True
                except IntegrityError:
                    session.rollback()
                    existing = (
                        session.query(AcademyCertificate)
                        .filter_by(
                            user_id=user_id,
                            course_key=course_key,
                            course_version=course_version,
                        )
                        .first()
                    )
                    if existing is not None:
                        return existing, False

        raise RuntimeError(
            "Não foi possível gerar um código público único para o certificado."
        )


class AcademyAPIRepository:
    """Repositório de acesso para os endpoints FastAPI da Academy."""

    def __init__(self, session: Session):
        self.session = session

    def list_progress(
        self, user_id: int, course_key: str, course_version: str
    ) -> list[AcademyLessonProgress]:
        return (
            self.session.query(AcademyLessonProgress)
            .filter_by(
                user_id=user_id,
                course_key=course_key,
                course_version=course_version,
            )
            .order_by(AcademyLessonProgress.started_at.asc())
            .all()
        )

    def list_lesson_attempts(
        self, user_id: int, course_key: str, course_version: str
    ) -> list[AcademyLessonQuizAttempt]:
        return (
            self.session.query(AcademyLessonQuizAttempt)
            .filter_by(
                user_id=user_id,
                course_key=course_key,
                course_version=course_version,
            )
            .order_by(AcademyLessonQuizAttempt.submitted_at.desc())
            .all()
        )


    def completed_lesson_keys(
        self, user_id: int, course_key: str, course_version: str
    ) -> set[str]:
        rows = (
            self.session.query(AcademyLessonProgress.lesson_key)
            .join(
                AcademyLessonQuizAttempt,
                and_(
                    AcademyLessonQuizAttempt.user_id
                    == AcademyLessonProgress.user_id,
                    AcademyLessonQuizAttempt.course_key
                    == AcademyLessonProgress.course_key,
                    AcademyLessonQuizAttempt.course_version
                    == AcademyLessonProgress.course_version,
                    AcademyLessonQuizAttempt.lesson_key
                    == AcademyLessonProgress.lesson_key,
                ),
            )
            .filter(
                AcademyLessonProgress.user_id == user_id,
                AcademyLessonProgress.course_key == course_key,
                AcademyLessonProgress.course_version == course_version,
                AcademyLessonProgress.completed_at.isnot(None),
                AcademyLessonQuizAttempt.passed.is_(True),
            )
            .distinct()
            .all()
        )
        return {row[0] for row in rows}

    def access_lesson(
        self,
        user_id: int,
        course_key: str,
        course_version: str,
        lesson_key: str,
    ) -> AcademyLessonProgress:
        now = datetime.datetime.utcnow()
        progress = (
            self.session.query(AcademyLessonProgress)
            .filter_by(
                user_id=user_id,
                course_key=course_key,
                course_version=course_version,
                lesson_key=lesson_key,
            )
            .first()
        )
        if progress is None:
            progress = AcademyLessonProgress(
                user_id=user_id,
                course_key=course_key,
                course_version=course_version,
                lesson_key=lesson_key,
                started_at=now,
                last_accessed_at=now,
            )
            self.session.add(progress)
        else:
            progress.last_accessed_at = now
        return progress

    def lesson_attempt_by_token(
        self, token: str
    ) -> AcademyLessonQuizAttempt | None:
        return (
            self.session.query(AcademyLessonQuizAttempt)
            .filter_by(attempt_token=token)
            .first()
        )

    def final_attempt_by_token(self, token: str) -> AcademyQuizAttempt | None:
        return (
            self.session.query(AcademyQuizAttempt)
            .filter_by(attempt_token=token)
            .first()
        )

    def add_lesson_attempt(self, **values) -> AcademyLessonQuizAttempt:
        attempt = AcademyLessonQuizAttempt(**values)
        self.session.add(attempt)
        return attempt

    def add_final_attempt(self, **values) -> AcademyQuizAttempt:
        attempt = AcademyQuizAttempt(**values)
        self.session.add(attempt)
        return attempt

    def certificate_for_course(
        self, user_id: int, course_key: str, course_version: str
    ) -> AcademyCertificate | None:
        return (
            self.session.query(AcademyCertificate)
            .filter_by(
                user_id=user_id,
                course_key=course_key,
                course_version=course_version,
            )
            .first()
        )

    def add_certificate(self, **values) -> AcademyCertificate:
        certificate = AcademyCertificate(**values)
        self.session.add(certificate)
        return certificate

    def list_certificates(self, user_id: int) -> list[AcademyCertificate]:
        return (
            self.session.query(AcademyCertificate)
            .filter_by(user_id=user_id)
            .order_by(AcademyCertificate.issued_at.desc())
            .all()
        )

    def get_certificate(self, user_id: int, certificate_id: int):
        return (
            self.session.query(AcademyCertificate)
            .filter_by(id=certificate_id, user_id=user_id)
            .first()
        )


__all__ = ["AcademyRepository", "AcademyAPIRepository"]
