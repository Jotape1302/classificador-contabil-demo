"""Modelos de progresso, tentativas de quiz e certificados da Zaeron Academy."""

import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from api.zaeron_api.core.database import Base


class AcademyLessonProgress(Base):
    """Progresso granular de um usuário em uma aula versionada."""

    __tablename__ = "academy_lesson_progress"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "course_key",
            "course_version",
            "lesson_key",
            name="uq_academy_progress_user_course_version_lesson",
        ),
        Index(
            "ix_academy_progress_user_course_version",
            "user_id",
            "course_key",
            "course_version",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_key = Column(String(100), nullable=False)
    course_version = Column(String(32), nullable=False)
    lesson_key = Column(String(100), nullable=False)
    started_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    last_accessed_at = Column(
        DateTime, default=datetime.datetime.utcnow, nullable=False
    )
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", backref="academy_progress")


class AcademyQuizAttempt(Base):
    """Tentativa submetida ao quiz final de uma versão de curso."""

    __tablename__ = "academy_quiz_attempts"
    __table_args__ = (
        UniqueConstraint("attempt_token", name="uq_academy_quiz_attempt_token"),
        Index(
            "ix_academy_quiz_user_course_version",
            "user_id",
            "course_key",
            "course_version",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_key = Column(String(100), nullable=False)
    course_version = Column(String(32), nullable=False)
    attempt_token = Column(String(64), nullable=False)
    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=False)
    score = Column(Numeric(5, 2), nullable=False)
    passed = Column(Boolean, nullable=False)
    answers_json = Column(Text, nullable=False)
    submitted_at = Column(
        DateTime, default=datetime.datetime.utcnow, nullable=False
    )

    user = relationship("User", backref="academy_quiz_attempts")


class AcademyLessonQuizAttempt(Base):
    """Tentativa de mini-quiz que controla a conclusão de uma aula."""

    __tablename__ = "academy_lesson_quiz_attempts"
    __table_args__ = (
        UniqueConstraint(
            "attempt_token", name="uq_academy_lesson_quiz_attempt_token"
        ),
        Index(
            "ix_academy_lesson_quiz_user_course_version_lesson",
            "user_id",
            "course_key",
            "course_version",
            "lesson_key",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_key = Column(String(100), nullable=False)
    course_version = Column(String(32), nullable=False)
    lesson_key = Column(String(100), nullable=False)
    attempt_token = Column(String(64), nullable=False)
    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=False)
    score = Column(Numeric(5, 2), nullable=False)
    passed = Column(Boolean, nullable=False)
    answers_json = Column(Text, nullable=False)
    submitted_at = Column(
        DateTime, default=datetime.datetime.utcnow, nullable=False
    )

    user = relationship("User", backref="academy_lesson_quiz_attempts")


class AcademyCertificate(Base):
    """Certificado verificável e imutável emitido após aprovação."""

    __tablename__ = "academy_certificates"
    __table_args__ = (
        UniqueConstraint(
            "public_code", name="uq_academy_certificate_public_code"
        ),
        UniqueConstraint(
            "user_id",
            "course_key",
            "course_version",
            name="uq_academy_certificate_user_course_version",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    attempt_id = Column(
        Integer,
        ForeignKey("academy_quiz_attempts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    public_code = Column(String(64), nullable=False)
    course_key = Column(String(100), nullable=False)
    course_version = Column(String(32), nullable=False)
    recipient_name = Column(String(255), nullable=False)
    course_title = Column(String(255), nullable=False)
    score = Column(Numeric(5, 2), nullable=False)
    issued_at = Column(
        DateTime, default=datetime.datetime.utcnow, nullable=False
    )
    revoked_at = Column(DateTime, nullable=True)

    user = relationship("User", backref="academy_certificates")
    attempt = relationship("AcademyQuizAttempt", backref="certificate")


__all__ = [
    "AcademyLessonProgress",
    "AcademyQuizAttempt",
    "AcademyLessonQuizAttempt",
    "AcademyCertificate",
]
