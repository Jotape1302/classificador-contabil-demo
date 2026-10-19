"""Contratos estritos e sanitizados da Academy."""

import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictStr, field_validator, model_validator


class AcademyQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question_key: str
    prompt: str
    options: dict[str, str]


class AcademyLessonSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lesson_key: str
    title: str
    order: int
    estimated_minutes: int
    passing_score: float
    status: Literal["locked", "in_progress", "completed"]
    is_unlocked: bool
    score: float | None = None
    passed: bool | None = None



class AcademyModule(BaseModel):
    model_config = ConfigDict(extra="forbid")

    module_key: str
    title: str
    description: str
    order: int
    lessons: list[AcademyLessonSummary]


class AcademyProgress(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_lessons: int
    completed_lessons: int
    percentage: float
    is_complete: bool
    continue_lesson_key: str | None


class FinalQuizManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    quiz_key: str
    title: str
    passing_score: float
    is_unlocked: bool
    questions: list[AcademyQuestion]


class AcademyCourseResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    course_key: str
    version: str
    title: str
    description: str
    estimated_duration_minutes: int
    modules: list[AcademyModule]
    progress: AcademyProgress
    final_quiz: FinalQuizManifest


class AcademyLessonResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lesson_key: str
    module_key: str
    module_title: str
    title: str
    estimated_minutes: int
    passing_score: float
    content_markdown: str
    questions: list[AcademyQuestion]


class QuizSubmitRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["lesson", "final"]
    lesson_key: StrictStr | None = Field(default=None, min_length=1, max_length=100)
    attempt_token: StrictStr = Field(min_length=8, max_length=64)
    answers: dict[StrictStr, StrictStr] = Field(min_length=1, max_length=50)

    @field_validator("attempt_token")
    @classmethod
    def strip_token(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("attempt_token inválido")
        return value

    @model_validator(mode="after")
    def validate_context(self):
        if self.kind == "lesson" and not self.lesson_key:
            raise ValueError("lesson_key é obrigatório para mini-quiz")
        if self.kind == "final" and self.lesson_key is not None:
            raise ValueError("lesson_key não é aceito no quiz final")
        return self


class QuestionFeedback(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question_key: str
    correct: bool
    explanation: str


class QuizSubmitResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["lesson", "final"]
    lesson_key: str | None
    attempt_token: str
    score: float
    passing_score: float
    passed: bool
    is_new_attempt: bool
    feedback: list[QuestionFeedback]
    next_lesson_key: str | None = None
    certificate_id: int | None = None
    certificate_code: str | None = None


class AcademyCertificateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    status: Literal["valid", "revoked"]
    public_code: str
    recipient_name: str
    course_title: str
    course_version: str
    score: float
    duration_minutes: int
    issued_at: datetime.datetime
    validation_path: str


class AcademyCertificateListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    certificates: list[AcademyCertificateResponse]


__all__ = [
    "AcademyCertificateListResponse",
    "AcademyCertificateResponse",
    "AcademyCourseResponse",
    "AcademyLessonResponse",
    "QuizSubmitRequest",
    "QuizSubmitResponse",
]
