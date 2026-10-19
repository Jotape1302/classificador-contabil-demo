"""Contratos públicos de usuário, perfil e cotas."""

import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, StrictStr, field_validator


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    name: str
    email: str
    office_name: str | None = None
    document_number: str = ""
    postal_code: str | None = None
    street: str | None = None
    neighborhood: str | None = None
    city: str | None = None
    state: str | None = None
    number: str | None = None
    complement: str | None = None
    is_verified: bool = True
    plan_tier: str = "unlimited"
    monthly_usage_count: int = 0
    usage_reset_at: datetime.datetime | None = None
    terms_accepted_at: datetime.datetime | None = None
    privacy_accepted_at: datetime.datetime | None = None
    terms_version: str | None = "1.0"
    created_at: datetime.datetime
    is_active: bool


class OfficeProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    erp_system: str | None
    client_range: str | None
    custom_rules: dict[str, Any] | list[Any] | str | None
    updated_at: datetime.datetime


class QuotaRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    monthly_processes: int = Field(ge=0)
    max_monthly_processes: int | None = None
    monthly_transactions: int = Field(ge=0)
    max_monthly_transactions: int | None = None
    plan_tier: str = "unlimited"
    monthly_usage_count: int = 0
    max_monthly_usages: int | None = None
    usage_reset_at: datetime.datetime | None = None


class CurrentUserResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user: UserRead
    profile: OfficeProfileRead | None
    quotas: QuotaRead
    onboarding_completed: bool
    terms_accepted: bool = True


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    office_name: StrictStr | None = Field(default=None, min_length=1, max_length=255)
    erp_system: StrictStr | None = Field(default=None, min_length=1, max_length=100)
    client_range: StrictStr | None = Field(default=None, min_length=1, max_length=50)

    @field_validator("office_name", "erp_system", "client_range")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None


class ProfileUpdateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user: UserRead
    profile: OfficeProfileRead
    onboarding_completed: bool


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: StrictStr | None = Field(default=None, min_length=1, max_length=255)
    email: StrictStr | None = Field(default=None, min_length=3, max_length=255)
    office_name: StrictStr | None = Field(default=None, max_length=255)
    erp_system: StrictStr | None = Field(default=None, max_length=100)
    client_range: StrictStr | None = Field(default=None, max_length=50)
    postal_code: StrictStr | None = Field(default=None, max_length=9)
    street: StrictStr | None = Field(default=None, max_length=255)
    neighborhood: StrictStr | None = Field(default=None, max_length=100)
    city: StrictStr | None = Field(default=None, max_length=100)
    state: StrictStr | None = Field(default=None, max_length=2)
    number: StrictStr | None = Field(default=None, max_length=20)
    complement: StrictStr | None = Field(default=None, max_length=100)

    @field_validator(
        "name",
        "email",
        "office_name",
        "erp_system",
        "client_range",
        "postal_code",
        "street",
        "neighborhood",
        "city",
        "state",
        "number",
        "complement",
    )
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None
