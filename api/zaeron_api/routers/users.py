"""Endpoints autenticados do usuário corrente."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.zaeron_api.core.errors import APIError
from api.zaeron_api.dependencies.auth import CurrentUser
from api.zaeron_api.dependencies.database import get_db
from api.zaeron_api.repositories.users import EmailAlreadyRegistered, UserRepository
from api.zaeron_api.schemas.users import (
    OfficeProfileRead,
    ProfileUpdate,
    ProfileUpdateResponse,
    UserRead,
    UserUpdate,
)


router = APIRouter(prefix="/users", tags=["users"])


@router.patch("/me", response_model=ProfileUpdateResponse)
def update_my_user_and_profile(
    payload: UserUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    repository = UserRepository(db)
    try:
        user, profile = repository.update_user_and_profile(
            user=current_user,
            name=payload.name,
            email=payload.email,
            office_name=payload.office_name,
            erp_system=payload.erp_system,
            client_range=payload.client_range,
            fields_set=payload.model_fields_set,
        )
    except EmailAlreadyRegistered as exc:
        raise APIError(
            409,
            "Este e-mail já está sendo utilizado por outro usuário.",
            "email_unavailable",
        ) from exc
    return ProfileUpdateResponse(
        user=UserRead.model_validate(user),
        profile=OfficeProfileRead.model_validate(profile),
        onboarding_completed=bool(profile.erp_system),
    )


@router.patch("/me/profile", response_model=ProfileUpdateResponse)
def update_my_profile(
    payload: ProfileUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    repository = UserRepository(db)
    profile = repository.update_profile(
        user=current_user,
        office_name=payload.office_name,
        erp_system=payload.erp_system,
        client_range=payload.client_range,
        fields_set=payload.model_fields_set,
    )
    return ProfileUpdateResponse(
        user=current_user,
        profile=OfficeProfileRead.model_validate(profile),
        onboarding_completed=bool(profile.erp_system),
    )

