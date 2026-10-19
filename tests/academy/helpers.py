"""Infraestrutura SQLite compartilhada pelos testes da Academy."""

import itertools

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from api.zaeron_api.core.database import Base
from api.zaeron_api.models import academy, classifier, users  # noqa: F401
from api.zaeron_api.models.users import User
from api.zaeron_api.repositories.academy import AcademyRepository
from api.zaeron_api.services.academy import load_course, ordered_lessons


_email_counter = itertools.count(1)


def create_test_context():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.create_all(bind=engine)
    return engine, session_factory, AcademyRepository(session_factory=session_factory)


def create_user(session_factory, name="Aluno Teste"):
    session = session_factory()
    try:
        suffix = next(_email_counter)
        user = User(
            name=name,
            email=f"academy_{suffix}@zaeron.test",
            password_hash="hash-de-teste",
            office_name="Escritório Teste",
            document_number=f"111444777{suffix:02d}",
            postal_code="01310-100",
            street="Avenida Paulista",
            neighborhood="Bela Vista",
            city="São Paulo",
            state="SP",
            number="1000",
            is_verified=True,
            is_active=True,
        )
        session.add(user)
        session.commit()
        return user
    finally:
        session.close()


def complete_course(repository, user_id):
    course = load_course()
    for lesson in ordered_lessons(course):
        repository.record_lesson_quiz_attempt(
            user_id=user_id,
            course_key=course["course_key"],
            course_version=course["version"],
            lesson_key=lesson["lesson_key"],
            attempt_token=f"complete-course-{user_id}-{lesson['lesson_key']}",
            total_questions=5,
            correct_answers=5,
            score=100.0,
            passed=True,
            answers_json="{}",
        )
    return course
