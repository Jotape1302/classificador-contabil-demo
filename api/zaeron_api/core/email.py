"""Módulo de conveniência e re-exportação do serviço de e-mails transacionais."""

from api.zaeron_api.services.mailer import (
    MailerService,
    build_otp_email_html,
    build_otp_email_text,
    send_otp_email,
)

__all__ = [
    "MailerService",
    "build_otp_email_html",
    "build_otp_email_text",
    "send_otp_email",
]
