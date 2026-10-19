"""Modelos de usuários, verificação OTP, perfis e consumo de cotas."""

import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from api.zaeron_api.core.database import Base


class User(Base):
    """Tabela de Usuários / Contadores."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    office_name = Column(String(255), nullable=True, default="")
    document_number = Column(
        String(18),
        unique=True,
        index=True,
        nullable=False,
        default="00000000000",
    )
    postal_code = Column(String(9), nullable=True)
    street = Column(String(255), nullable=True)
    neighborhood = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(2), nullable=True)
    number = Column(String(20), nullable=True)
    complement = Column(String(100), nullable=True)
    is_verified = Column(Boolean, nullable=False, default=True)
    plan_tier = Column(String(20), nullable=False, default="free")
    monthly_usage_count = Column(Integer, nullable=False, default=0)
    usage_reset_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.datetime.utcnow() + datetime.timedelta(days=30),
    )
    terms_accepted_at = Column(DateTime, nullable=True)
    privacy_accepted_at = Column(DateTime, nullable=True)
    terms_version = Column(String(20), nullable=True, default="1.0")
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, nullable=False, default=True)

    # Relacionamentos 1:1 e 1:N
    profile = relationship(
        "OfficeProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    usage_logs = relationship(
        "UsageLog",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    classification_rules = relationship(
        "ClassificationRule",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    processed_transactions = relationship(
        "ProcessedTransaction",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "office_name": self.office_name,
            "document_number": self.document_number,
            "postal_code": self.postal_code,
            "street": self.street,
            "neighborhood": self.neighborhood,
            "city": self.city,
            "state": self.state,
            "number": self.number,
            "complement": self.complement,
            "is_verified": self.is_verified,
            "plan_tier": self.plan_tier,
            "monthly_usage_count": self.monthly_usage_count,
            "usage_reset_at": self.usage_reset_at.isoformat()
            if self.usage_reset_at
            else None,
            "terms_accepted_at": self.terms_accepted_at.isoformat()
            if self.terms_accepted_at
            else None,
            "privacy_accepted_at": self.privacy_accepted_at.isoformat()
            if self.privacy_accepted_at
            else None,
            "terms_version": self.terms_version,
            "created_at": self.created_at.isoformat()
            if self.created_at
            else None,
            "is_active": self.is_active,
        }


class EmailVerification(Base):
    """Tabela de Verificação OTP de E-mail."""

    __tablename__ = "email_verifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), index=True, nullable=False)
    code_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


class OfficeProfile(Base):
    """Tabela de Perfil e Configurações do Escritório Contábil."""

    __tablename__ = "office_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    erp_system = Column(String(100), nullable=True, default="Domínio Sistemas")
    client_range = Column(String(50), nullable=True, default="1-20")
    custom_rules = Column(Text, nullable=True, default='{"regras": []}')
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        nullable=False,
    )

    user = relationship("User", back_populates="profile")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "erp_system": self.erp_system,
            "client_range": self.client_range,
            "custom_rules": self.custom_rules,
            "updated_at": self.updated_at.isoformat()
            if self.updated_at
            else None,
        }


class UsageLog(Base):
    """Tabela de Registro de Uso e Consumo de Cotas."""

    __tablename__ = "usage_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    file_name = Column(String(255), nullable=True)
    transactions_count = Column(Integer, nullable=False, default=0)
    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        nullable=False,
    )

    user = relationship("User", back_populates="usage_logs")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "file_name": self.file_name,
            "transactions_count": self.transactions_count,
            "created_at": self.created_at.isoformat()
            if self.created_at
            else None,
        }


__all__ = ["User", "EmailVerification", "OfficeProfile", "UsageLog"]
