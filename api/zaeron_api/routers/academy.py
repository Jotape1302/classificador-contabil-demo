"""Endpoints autenticados da Zaeron Academy."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.zaeron_api.dependencies.auth import CurrentUser
from api.zaeron_api.dependencies.database import get_db
from api.zaeron_api.schemas.academy import (
    AcademyCertificateListResponse,
    AcademyCertificateResponse,
    AcademyCourseResponse,
    AcademyLessonResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from api.zaeron_api.services.academy import AcademyAPIService


router = APIRouter(prefix="/academy", tags=["academy"])


@router.get("/course", response_model=AcademyCourseResponse)
def get_course(current_user: CurrentUser, db: Session = Depends(get_db)):
    return AcademyAPIService(db).course_manifest(current_user.id)


@router.get("/lessons/{lesson_id}", response_model=AcademyLessonResponse)
def get_lesson(
    lesson_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    return AcademyAPIService(db).access_lesson(current_user.id, lesson_id)


@router.post("/quiz/submit", response_model=QuizSubmitResponse)
def submit_quiz(
    payload: QuizSubmitRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    return AcademyAPIService(db).submit(current_user, payload)


@router.get("/certificates", response_model=AcademyCertificateListResponse)
def list_certificates(current_user: CurrentUser, db: Session = Depends(get_db)):
    return AcademyCertificateListResponse(
        certificates=AcademyAPIService(db).certificates(current_user.id)
    )


@router.get("/certificates/{certificate_id}", response_model=AcademyCertificateResponse)
def get_certificate(
    certificate_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    return AcademyAPIService(db).certificate(current_user.id, certificate_id)


__all__ = ["router"]
