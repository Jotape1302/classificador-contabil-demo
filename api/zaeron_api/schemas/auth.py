"""Entradas e saídas de autenticação e verificação OTP."""

import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, StrictStr, field_validator

from api.zaeron_api.core.validators import (
    clean_digits,
    format_cep,
    validate_cep,
    validate_document,
)
from api.zaeron_api.schemas.users import UserRead


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: StrictStr = Field(min_length=3, max_length=255)
    password: StrictStr = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or "." not in normalized:
            raise ValueError("endereço de e-mail inválido")
        return normalized


class RegisterStartRequest(BaseModel):
    """Requisição de cadastro qualificado completo com endereço e CPF/CNPJ."""
    model_config = ConfigDict(extra="forbid")

    name: StrictStr = Field(min_length=1, max_length=255)
    email: StrictStr = Field(min_length=3, max_length=255)
    password: StrictStr = Field(min_length=12, max_length=128)
    document_number: StrictStr = Field(min_length=11, max_length=20)
    postal_code: StrictStr = Field(min_length=8, max_length=10)
    street: StrictStr = Field(min_length=1, max_length=255)
    neighborhood: StrictStr = Field(min_length=1, max_length=100)
    city: StrictStr = Field(min_length=1, max_length=100)
    state: StrictStr = Field(min_length=2, max_length=2)
    number: StrictStr = Field(min_length=1, max_length=20)
    complement: str | None = Field(default=None, max_length=100)
    office_name: str | None = Field(default=None, max_length=255)
    terms_accepted: bool = Field(default=True)

    @field_validator("name", "street", "neighborhood", "city", "number")
    @classmethod
    def strip_required(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("campo obrigatório")
        return stripped

    @field_validator("state")
    @classmethod
    def validate_state(cls, value: str) -> str:
        stripped = value.strip().upper()
        if len(stripped) != 2:
            raise ValueError("UF deve conter exatamente 2 letras")
        return stripped

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or "." not in normalized:
            raise ValueError("endereço de e-mail inválido")
        return normalized

    @field_validator("document_number")
    @classmethod
    def validate_doc(cls, value: str) -> str:
        is_valid, digits, _ = validate_document(value)
        if not is_valid:
            raise ValueError("CPF ou CNPJ inválido.")
        return digits

    @field_validator("postal_code")
    @classmethod
    def validate_postal(cls, value: str) -> str:
        if not validate_cep(value):
            raise ValueError("CEP inválido. Deve conter 8 dígitos numéricos.")
        return format_cep(value)

    @field_validator("complement", "office_name")
    @classmethod
    def strip_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped if stripped else None


class RegisterRequest(BaseModel):
    """Contrato de cadastro direto (nome, e-mail, senha, CPF/CNPJ)."""
    model_config = ConfigDict(extra="ignore")

    name: StrictStr = Field(min_length=1, max_length=255)
    email: StrictStr = Field(min_length=3, max_length=255)
    password: StrictStr = Field(min_length=12, max_length=128)
    document_number: StrictStr = Field(min_length=11, max_length=20)
    office_name: str | None = Field(default=None, max_length=255)
    terms_accepted: bool = Field(default=True)

    @field_validator("name")
    @classmethod
    def strip_required_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("campo obrigatório")
        return stripped

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or "." not in normalized:
            raise ValueError("endereço de e-mail inválido")
        return normalized

    @field_validator("document_number")
    @classmethod
    def validate_doc(cls, value: str) -> str:
        is_valid, digits, _ = validate_document(value)
        if not is_valid:
            raise ValueError("CPF ou CNPJ inválido.")
        return digits

    @field_validator("office_name")
    @classmethod
    def strip_optional_office(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped if stripped else None


class VerifyCodeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: StrictStr = Field(min_length=3, max_length=255)
    code: StrictStr = Field(min_length=6, max_length=6)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or "." not in normalized:
            raise ValueError("endereço de e-mail inválido")
        return normalized

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        digits = clean_digits(value)
        if len(digits) != 6:
            raise ValueError("O código deve conter 6 dígitos numéricos.")
        return digits


class ResendCodeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: StrictStr = Field(min_length=3, max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or "." not in normalized:
            raise ValueError("endereço de e-mail inválido")
        return normalized


class RegisterStartResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str
    email: str


class AuthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user: UserRead
    session_expires_at: datetime.datetime


class ChangePasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_password: StrictStr = Field(min_length=1, max_length=128)
    new_password: StrictStr = Field(min_length=12, max_length=128)
    confirm_password: StrictStr = Field(min_length=12, max_length=128)

    @field_validator("confirm_password")
    @classmethod
    def validate_password_match(cls, value: str, info) -> str:
        if "new_password" in info.data and value != info.data["new_password"]:
            raise ValueError("A confirmação de senha não confere com a nova senha.")
        return value


class ConsentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    terms_accepted: bool = Field(default=True)
    privacy_accepted: bool = Field(default=True)
    version: StrictStr = Field(default="1.0", max_length=20)
