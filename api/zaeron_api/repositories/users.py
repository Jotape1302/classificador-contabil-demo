"""Persistência de usuários, verificação OTP, cotas e perfis."""

import datetime
import json
from dataclasses import dataclass

from sqlalchemy import desc, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from api.zaeron_api.core.database import set_rls_user_context
from api.zaeron_api.models.users import (
    EmailVerification,
    OfficeProfile,
    UsageLog,
    User,
)
from api.zaeron_api.core.security import hash_password, verify_password
from api.zaeron_api.core.validators import clean_digits


class EmailAlreadyRegistered(ValueError):
    pass


class DocumentAlreadyRegistered(ValueError):
    pass


@dataclass(frozen=True)
class UsageTotals:
    processes: int
    transactions: int


class UserRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_by_email(self, email: str) -> User | None:
        return (
            self.session.query(User)
            .filter(func.lower(User.email) == email.strip().lower())
            .first()
        )

    def get_by_document(self, document_number: str) -> User | None:
        digits = clean_digits(document_number)
        return (
            self.session.query(User)
            .filter(User.document_number == digits)
            .first()
        )

    def get_by_id(self, user_id: int) -> User | None:
        return self.session.get(User, user_id)

    def create_user_direct(
        self,
        *,
        name: str,
        email: str,
        password: str,
        document_number: str,
        office_name: str | None = None,
    ) -> User:
        """
        Cadastro direto: usuário criado verificado, com plano Free,
        prevenção de duplicidade por e-mail e CPF/CNPJ, sem dependência de OTP.
        """
        normalized_email = email.strip().lower()
        cleaned_doc = clean_digits(document_number)

        if self.get_by_email(normalized_email) is not None:
            raise EmailAlreadyRegistered("Este e-mail já está cadastrado.")

        if self.get_by_document(cleaned_doc) is not None:
            raise DocumentAlreadyRegistered("Este CPF/CNPJ já está cadastrado.")

        now_utc = datetime.datetime.now(datetime.timezone.utc)
        reset_at = now_utc + datetime.timedelta(days=30)

        user = User(
            name=name.strip(),
            email=normalized_email,
            password_hash=hash_password(password),
            office_name=office_name.strip() if office_name else "",
            document_number=cleaned_doc,
            postal_code=None,
            street=None,
            neighborhood=None,
            city=None,
            state=None,
            number=None,
            complement=None,
            is_verified=True,
            is_active=True,
            plan_tier="free",
            monthly_usage_count=0,
            usage_reset_at=reset_at,
            terms_accepted_at=now_utc,
            privacy_accepted_at=now_utc,
            terms_version="1.0",
        )
        self.session.add(user)
        try:
            self.session.flush()
            set_rls_user_context(self.session, user.id)
            profile = self.get_profile(user.id)
            if profile is None:
                self.session.add(
                    OfficeProfile(
                        user_id=user.id,
                        erp_system="Domínio Sistemas",
                        client_range="1-20",
                        custom_rules=json.dumps({"regras": []}),
                    )
                )
            self.session.commit()
            self.session.refresh(user)
            return user
        except IntegrityError as exc:
            self.session.rollback()
            if self.get_by_document(cleaned_doc) is not None:
                raise DocumentAlreadyRegistered("Este CPF/CNPJ já está cadastrado.") from exc
            raise EmailAlreadyRegistered("Este e-mail já está cadastrado.") from exc
        except Exception:
            self.session.rollback()
            raise

    def create_or_update_unverified_user(
        self,
        *,
        name: str,
        email: str,
        password: str,
        document_number: str,
        postal_code: str | None = None,
        street: str | None = None,
        neighborhood: str | None = None,
        city: str | None = None,
        state: str | None = None,
        number: str | None = None,
        complement: str | None = None,
        office_name: str | None = None,
    ) -> User:
        """Compatibilidade para cadastro direto."""
        return self.create_user_direct(
            name=name,
            email=email,
            password=password,
            document_number=document_number,
            office_name=office_name,
        )

    def create_with_profile(
        self,
        *,
        name: str,
        email: str,
        password: str,
        office_name: str | None = None,
        document_number: str | None = None,
        postal_code: str | None = None,
        street: str | None = None,
        neighborhood: str | None = None,
        city: str | None = None,
        state: str | None = None,
        number: str | None = None,
        complement: str | None = None,
        is_verified: bool = True,
    ) -> User:
        """Compatibilidade com fixtures e cadastro direto."""
        normalized_email = email.strip().lower()
        if self.get_by_email(normalized_email) is not None:
            raise EmailAlreadyRegistered("Este e-mail já está cadastrado.")

        cleaned_doc = clean_digits(document_number) if document_number else f"000{int(datetime.datetime.now(datetime.timezone.utc).timestamp()*1000)%100000000:08d}"
        if self.get_by_document(cleaned_doc) is not None:
            raise DocumentAlreadyRegistered("Este CPF/CNPJ já está cadastrado.")

        now_utc = datetime.datetime.now(datetime.timezone.utc)
        user = User(
            name=name.strip(),
            email=normalized_email,
            password_hash=hash_password(password),
            office_name=office_name.strip() if office_name else "",
            document_number=cleaned_doc,
            postal_code=postal_code.strip() if postal_code else None,
            street=street.strip() if street else None,
            neighborhood=neighborhood.strip() if neighborhood else None,
            city=city.strip() if city else None,
            state=state.strip().upper() if state else None,
            number=number.strip() if number else None,
            complement=complement.strip() if complement else None,
            is_verified=is_verified,
            plan_tier="free",
            monthly_usage_count=0,
            usage_reset_at=now_utc + datetime.timedelta(days=30),
            terms_accepted_at=now_utc,
            privacy_accepted_at=now_utc,
            terms_version="1.0",
            is_active=True,
        )
        self.session.add(user)
        try:
            self.session.flush()
            set_rls_user_context(self.session, user.id)
            self.session.add(
                OfficeProfile(
                    user_id=user.id,
                    erp_system="Domínio Sistemas",
                    client_range="1-20",
                    custom_rules=json.dumps({"regras": []}),
                )
            )
            self.session.commit()
            self.session.refresh(user)
            return user
        except IntegrityError as exc:
            self.session.rollback()
            if self.get_by_document(cleaned_doc) is not None:
                raise DocumentAlreadyRegistered("Este CPF/CNPJ já está cadastrado.") from exc
            raise EmailAlreadyRegistered("Este e-mail já está cadastrado.") from exc
        except Exception:
            self.session.rollback()
            raise

    def record_consent(self, user_id: int, version: str = "1.0") -> User | None:
        """Registra o aceite explícito dos termos de uso e política de privacidade."""
        user = self.get_by_id(user_id)
        if user is None:
            return None
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        user.terms_accepted_at = now_utc
        user.privacy_accepted_at = now_utc
        user.terms_version = version
        self.session.commit()
        self.session.refresh(user)
        return user

    # --------------------------------------------------------------------------
    # Verificação OTP
    # --------------------------------------------------------------------------

    def save_otp_verification(
        self,
        *,
        email: str,
        code_hash: str,
        expires_at: datetime.datetime,
    ) -> EmailVerification:
        normalized_email = email.strip().lower()
        verification = EmailVerification(
            email=normalized_email,
            code_hash=code_hash,
            expires_at=expires_at,
            attempts=0,
            created_at=datetime.datetime.now(datetime.timezone.utc),
        )
        self.session.add(verification)
        self.session.commit()
        self.session.refresh(verification)
        return verification

    def get_latest_otp(self, email: str) -> EmailVerification | None:
        normalized_email = email.strip().lower()
        return (
            self.session.query(EmailVerification)
            .filter(func.lower(EmailVerification.email) == normalized_email)
            .order_by(desc(EmailVerification.created_at))
            .first()
        )

    def increment_otp_attempts(self, verification: EmailVerification) -> int:
        verification.attempts += 1
        self.session.commit()
        return verification.attempts

    def clear_otps(self, email: str) -> None:
        normalized_email = email.strip().lower()
        self.session.query(EmailVerification).filter(
            func.lower(EmailVerification.email) == normalized_email
        ).delete(synchronize_session=False)
        self.session.commit()

    def verify_user(self, email: str) -> User | None:
        user = self.get_by_email(email)
        if user is not None:
            user.is_verified = True
            user.is_active = True
            self.session.commit()
            self.session.refresh(user)
        return user

    # --------------------------------------------------------------------------
    # Gestão de Cotas & Limites
    # --------------------------------------------------------------------------

    def check_and_reset_usage(self, user_id: int) -> User | None:
        user = self.get_by_id(user_id)
        if user is None:
            return None

        now = datetime.datetime.now(datetime.timezone.utc)
        # Converte para timezone-aware se for naive
        reset_at = user.usage_reset_at
        if reset_at is not None and reset_at.tzinfo is None:
            reset_at = reset_at.replace(tzinfo=datetime.timezone.utc)

        if reset_at is None or now >= reset_at:
            user.monthly_usage_count = 0
            user.usage_reset_at = now + datetime.timedelta(days=30)
            self.session.commit()
            self.session.refresh(user)
        return user

    def increment_usage(self, user_id: int) -> int:
        user = self.get_by_id(user_id)
        if user is None:
            return 0
        user.monthly_usage_count = (user.monthly_usage_count or 0) + 1
        self.session.commit()
        return user.monthly_usage_count

    # --------------------------------------------------------------------------
    # Perfil e Atualizações
    # --------------------------------------------------------------------------

    def get_profile(self, user_id: int) -> OfficeProfile | None:
        return (
            self.session.query(OfficeProfile)
            .filter(OfficeProfile.user_id == user_id)
            .first()
        )

    def get_monthly_usage(self, user_id: int) -> UsageTotals:
        now = datetime.datetime.now(datetime.timezone.utc)
        month_start = datetime.datetime(now.year, now.month, 1, tzinfo=datetime.timezone.utc)
        processes, transactions = (
            self.session.query(
                func.count(UsageLog.id),
                func.coalesce(func.sum(UsageLog.transactions_count), 0),
            )
            .filter(UsageLog.user_id == user_id, UsageLog.created_at >= month_start)
            .one()
        )
        return UsageTotals(
            processes=int(processes or 0),
            transactions=int(transactions or 0),
        )

    def update_profile(
        self,
        *,
        user: User,
        office_name: str | None,
        erp_system: str | None,
        client_range: str | None,
        fields_set: set[str],
    ) -> OfficeProfile:
        profile = self.get_profile(user.id)
        if profile is None:
            profile = OfficeProfile(
                user_id=user.id,
                custom_rules=json.dumps({"regras": []}),
            )
            self.session.add(profile)

        if "office_name" in fields_set:
            user.office_name = office_name
        if "erp_system" in fields_set:
            profile.erp_system = erp_system
        if "client_range" in fields_set:
            profile.client_range = client_range
        profile.updated_at = datetime.datetime.now(datetime.timezone.utc)

        try:
            self.session.commit()
            self.session.refresh(user)
            self.session.refresh(profile)
            return profile
        except Exception:
            self.session.rollback()
            raise

    def update_user_and_profile(
        self,
        *,
        user: User,
        name: str | None = None,
        email: str | None = None,
        office_name: str | None = None,
        erp_system: str | None = None,
        client_range: str | None = None,
        postal_code: str | None = None,
        street: str | None = None,
        neighborhood: str | None = None,
        city: str | None = None,
        state: str | None = None,
        number: str | None = None,
        complement: str | None = None,
        fields_set: set[str],
    ) -> tuple[User, OfficeProfile]:
        if "email" in fields_set and email:
            normalized_email = email.strip().lower()
            existing = self.get_by_email(normalized_email)
            if existing is not None and existing.id != user.id:
                raise EmailAlreadyRegistered("E-mail já cadastrado por outro usuário.")
            user.email = normalized_email

        if "name" in fields_set and name:
            user.name = name.strip()

        if "office_name" in fields_set:
            user.office_name = office_name.strip() if office_name else None

        if "postal_code" in fields_set and postal_code:
            user.postal_code = postal_code.strip()
        if "street" in fields_set and street:
            user.street = street.strip()
        if "neighborhood" in fields_set and neighborhood:
            user.neighborhood = neighborhood.strip()
        if "city" in fields_set and city:
            user.city = city.strip()
        if "state" in fields_set and state:
            user.state = state.strip().upper()
        if "number" in fields_set and number:
            user.number = number.strip()
        if "complement" in fields_set:
            user.complement = complement.strip() if complement else None

        profile = self.get_profile(user.id)
        if profile is None:
            profile = OfficeProfile(
                user_id=user.id,
                custom_rules=json.dumps({"regras": []}),
            )
            self.session.add(profile)

        if "erp_system" in fields_set:
            profile.erp_system = erp_system.strip() if erp_system else None
        if "client_range" in fields_set:
            profile.client_range = client_range.strip() if client_range else None
        profile.updated_at = datetime.datetime.now(datetime.timezone.utc)

        try:
            self.session.commit()
            self.session.refresh(user)
            self.session.refresh(profile)
            return user, profile
        except Exception:
            self.session.rollback()
            raise

    def change_password(self, user_id: int, current_password: str, new_password: str) -> User:
        user = self.get_by_id(user_id)
        if user is None:
            raise ValueError("Usuário não encontrado.")
        if not verify_password(current_password, user.password_hash):
            raise ValueError("Senha atual incorreta.")
        user.password_hash = hash_password(new_password)
        try:
            self.session.commit()
            self.session.refresh(user)
            return user
        except Exception:
            self.session.rollback()
            raise
