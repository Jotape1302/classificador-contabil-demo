"""Fluxo integrado da Academy na API Strangler."""

import json

from api.zaeron_api.models.academy import (
    AcademyCertificate,
    AcademyLessonProgress,
    AcademyLessonQuizAttempt,
    AcademyQuizAttempt,
)
from api.zaeron_api.services.academy import load_course, ordered_lessons


def _login(client, legacy_user):
    response = client.post(
        "/api/auth/login",
        json={"email": legacy_user.email, "password": "senha-legada"},
    )
    assert response.status_code == 200


def _answers(questions, correct_count: int):
    return {
        question["question_key"]: question["correct_option"] if index < correct_count else "invalid"
        for index, question in enumerate(questions)
    }


def _assert_sanitized(payload):
    serialized = json.dumps(payload, ensure_ascii=False)
    assert "correct_option" not in serialized
    assert "password_hash" not in serialized


def test_academy_requires_authenticated_session(client):
    for path in (
        "/api/academy/course",
        "/api/academy/lessons/m01_a01",
        "/api/academy/certificates",
        "/api/academy/certificates/1",
    ):
        assert client.get(path).status_code == 401
    assert client.post(
        "/api/academy/quiz/submit",
        json={
            "kind": "lesson",
            "lesson_key": "m01_a01",
            "attempt_token": "unauthenticated-token",
            "answers": {"q": "a"},
        },
    ).status_code == 401


def test_complete_academy_flow_thresholds_idempotency_and_certificate(
    client, legacy_user, session_factory
):
    _login(client, legacy_user)
    course_source = load_course()
    lessons = ordered_lessons(course_source)

    manifest = client.get("/api/academy/course")
    assert manifest.status_code == 200
    _assert_sanitized(manifest.json())
    assert manifest.json()["progress"]["completed_lessons"] == 0
    assert manifest.json()["modules"][0]["lessons"][0]["is_unlocked"] is True
    assert manifest.json()["modules"][1]["lessons"][0]["status"] == "locked"
    assert manifest.json()["final_quiz"]["questions"] == []

    first = lessons[0]
    lesson_response = client.get(f"/api/academy/lessons/{first['lesson_key']}")
    assert lesson_response.status_code == 200
    assert lesson_response.json()["passing_score"] == 60
    assert lesson_response.json()["content_markdown"]
    _assert_sanitized(lesson_response.json())

    locked = client.get(f"/api/academy/lessons/{lessons[1]['lesson_key']}")
    assert locked.status_code == 409
    assert locked.json()["code"] == "lesson_locked"

    failed = client.post(
        "/api/academy/quiz/submit",
        json={
            "kind": "lesson",
            "lesson_key": first["lesson_key"],
            "attempt_token": "lesson-first-failed",
            "answers": _answers(first["questions"], 2),
        },
    )
    assert failed.status_code == 200
    assert failed.json()["score"] == 40
    assert failed.json()["passed"] is False
    assert client.get(f"/api/academy/lessons/{lessons[1]['lesson_key']}").status_code == 409

    passed = client.post(
        "/api/academy/quiz/submit",
        json={
            "kind": "lesson",
            "lesson_key": first["lesson_key"],
            "attempt_token": "lesson-first-passed",
            "answers": _answers(first["questions"], 3),
        },
    )
    assert passed.status_code == 200
    assert passed.json()["score"] == 60
    assert passed.json()["passed"] is True
    assert passed.json()["next_lesson_key"] == lessons[1]["lesson_key"]
    assert client.get(f"/api/academy/lessons/{lessons[1]['lesson_key']}").status_code == 200

    repeated = client.post(
        "/api/academy/quiz/submit",
        json={
            "kind": "lesson",
            "lesson_key": first["lesson_key"],
            "attempt_token": "lesson-first-passed",
            "answers": _answers(first["questions"], 0),
        },
    )
    assert repeated.status_code == 200
    assert repeated.json()["is_new_attempt"] is False
    assert repeated.json()["score"] == 60

    for index, lesson in enumerate(lessons[1:], start=2):
        accessed = client.get(f"/api/academy/lessons/{lesson['lesson_key']}")
        assert accessed.status_code == 200
        _assert_sanitized(accessed.json())
        submission = client.post(
            "/api/academy/quiz/submit",
            json={
                "kind": "lesson",
                "lesson_key": lesson["lesson_key"],
                "attempt_token": f"lesson-pass-{index}",
                "answers": _answers(lesson["questions"], len(lesson["questions"])),
            },
        )
        assert submission.status_code == 200
        assert submission.json()["passed"] is True

    completed_manifest = client.get("/api/academy/course")
    assert completed_manifest.status_code == 200
    assert completed_manifest.json()["progress"]["is_complete"] is True
    assert completed_manifest.json()["final_quiz"]["is_unlocked"] is True
    assert len(completed_manifest.json()["final_quiz"]["questions"]) == 10
    assert completed_manifest.json()["final_quiz"]["passing_score"] == 70
    first_lesson_summary = completed_manifest.json()["modules"][0]["lessons"][0]
    assert first_lesson_summary["score"] == 60
    assert first_lesson_summary["passed"] is True
    _assert_sanitized(completed_manifest.json())


    final_questions = course_source["quiz"]["questions"]
    failed_final = client.post(
        "/api/academy/quiz/submit",
        json={
            "kind": "final",
            "attempt_token": "final-failed-60",
            "answers": _answers(final_questions, 6),
        },
    )
    assert failed_final.status_code == 200
    assert failed_final.json()["score"] == 60
    assert failed_final.json()["passed"] is False
    assert failed_final.json()["certificate_id"] is None

    passed_final = client.post(
        "/api/academy/quiz/submit",
        json={
            "kind": "final",
            "attempt_token": "final-passed-70",
            "answers": _answers(final_questions, 7),
        },
    )
    assert passed_final.status_code == 200
    body = passed_final.json()
    assert body["score"] == 70
    assert body["passed"] is True
    assert body["certificate_code"].startswith("ZAC-")
    certificate_id = body["certificate_id"]

    repeated_final = client.post(
        "/api/academy/quiz/submit",
        json={
            "kind": "final",
            "attempt_token": "final-passed-70",
            "answers": _answers(final_questions, 0),
        },
    )
    assert repeated_final.status_code == 200
    assert repeated_final.json()["is_new_attempt"] is False
    assert repeated_final.json()["certificate_id"] == certificate_id

    listing = client.get("/api/academy/certificates")
    detail = client.get(f"/api/academy/certificates/{certificate_id}")
    public = client.get(f"/api/public/certificates/{body['certificate_code']}")
    assert listing.status_code == detail.status_code == public.status_code == 200
    assert len(listing.json()["certificates"]) == 1
    assert detail.json()["recipient_name"] == legacy_user.name
    assert detail.json()["validation_path"] == f"/?certificado={body['certificate_code']}"
    assert public.json()["public_code"] == body["certificate_code"]
    assert set(public.json()) == {
        "status",
        "recipient_name",
        "course_title",
        "duration_minutes",
        "issued_at",
        "public_code",
        "seal",
    }

    session = session_factory()
    try:
        assert session.query(AcademyLessonProgress).count() == len(lessons)
        assert session.query(AcademyLessonQuizAttempt).count() == len(lessons) + 1
        assert session.query(AcademyQuizAttempt).count() == 2
        assert session.query(AcademyCertificate).count() == 1
    finally:
        session.close()


def test_attempt_token_cannot_cross_users(client, legacy_user, session_factory):
    _login(client, legacy_user)
    lesson = ordered_lessons(load_course())[0]
    first = client.post(
        "/api/academy/quiz/submit",
        json={
            "kind": "lesson",
            "lesson_key": lesson["lesson_key"],
            "attempt_token": "shared-attempt-token",
            "answers": _answers(lesson["questions"], 5),
        },
    )
    assert first.status_code == 200

    from api.zaeron_api.core.security import hash_password
    from api.zaeron_api.models.users import User

    session = session_factory()
    try:
        other = User(
            name="Outra Pessoa",
            email="outra@zaeron.test",
            password_hash=hash_password("outra-senha"),
            document_number="83584852020",
            postal_code="04538-133",
            street="Avenida Brigadeiro Faria Lima",
            neighborhood="Itaim Bibi",
            city="São Paulo",
            state="SP",
            number="2000",
            is_verified=True,
            is_active=True,
        )
        session.add(other)
        session.commit()
    finally:
        session.close()
    client.post("/api/auth/logout", json={})
    assert client.post(
        "/api/auth/login", json={"email": "outra@zaeron.test", "password": "outra-senha"}
    ).status_code == 200
    conflict = client.post(
        "/api/academy/quiz/submit",
        json={
            "kind": "lesson",
            "lesson_key": lesson["lesson_key"],
            "attempt_token": "shared-attempt-token",
            "answers": _answers(lesson["questions"], 5),
        },
    )
    assert conflict.status_code == 409
    assert conflict.json()["code"] == "attempt_token_conflict"
