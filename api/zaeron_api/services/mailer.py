"""Serviço de envio de e-mails transacionais (Resend HTTP API e SMTP padrão com fallback)."""

import logging
from email.message import EmailMessage
from typing import Optional

import httpx

try:
    import aiosmtplib
except ImportError:  # pragma: no cover
    aiosmtplib = None

from api.zaeron_api.core.config import Settings, get_settings

logger = logging.getLogger("zaeron_api.mailer")

RESEND_API_URL = "https://api.resend.com/emails"


def build_otp_email_html(code: str) -> str:
    """Gera o template HTML corporativo moderno e responsivo para envio do código OTP."""
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seu código de acesso Zaeron Contábil</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090B0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F4EFEA;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #090B0D; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #111419; border: 1px solid #2A3038; border-radius: 12px; overflow: hidden; padding: 0; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);">
          <!-- Header Institucional -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #1E232B;">
              <div style="font-size: 22px; font-weight: 800; letter-spacing: 0.5px; color: #F4EFEA;">
                <span style="color: #C8753D;">ZAERON</span> CONTÁBIL
              </div>
              <div style="font-size: 13px; color: #A39B93; margin-top: 4px; letter-spacing: 0.2px;">
                Inteligência e Automação Contábil
              </div>
            </td>
          </tr>

          <!-- Corpo Principal -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px 0; color: #F4EFEA; text-align: center;">
                Confirmação de Cadastro
              </h1>
              <p style="font-size: 14px; line-height: 1.6; color: #D1CBC5; margin: 0 0 24px 0; text-align: center;">
                Utilize o código de verificação abaixo para confirmar seu endereço de e-mail e concluir seu acesso à plataforma Zaeron:
              </p>
              
              <!-- Bloco OTP Centralizado -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 28px 0;">
                <tr>
                  <td align="center">
                    <div style="background-color: #171B20; border: 1px solid #C8753D; border-radius: 8px; padding: 18px 32px; display: inline-block; text-align: center;">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #F08A3E; margin-right: -8px;">
                        {code}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Aviso de Segurança -->
              <div style="background-color: #171B20; border-left: 3px solid #C8753D; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #A39B93;">
                  ⏱️ <strong>Aviso de segurança:</strong> Este código expira em <strong>15 minutos</strong>. Se você não solicitou este cadastro, desconsidere esta mensagem.
                </p>
              </div>
            </td>
          </tr>

          <!-- Rodapé Institucional -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0D0F13; border-top: 1px solid #1E232B; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #736C65; line-height: 1.5;">
                &copy; Zaeron Contábil — Plataforma de Conciliação e Inteligência Contábil.<br>
                Este é um e-mail transacional automático. Por favor, não responda a esta mensagem.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def build_otp_email_text(code: str) -> str:
    """Gera a versão em texto puro do e-mail de código OTP."""
    return f"""Seu código de acesso Zaeron Contábil

Confirmação de Cadastro:
Utilize o código de verificação abaixo para concluir o acesso à plataforma Zaeron:

{code}

Aviso de segurança: Este código expira em 15 minutos. Se você não solicitou este cadastro, desconsidere esta mensagem.

--
Zaeron Contábil
Inteligência e Automação Contábil
"""


class MailerService:
    """Serviço assíncrono para despacho de e-mails transacionais com fallback."""

    def __init__(self, settings: Optional[Settings] = None) -> None:
        self.settings = settings or get_settings()

    @property
    def has_resend_config(self) -> bool:
        return bool(self.settings.resend_api_key and self.settings.resend_api_key.strip())

    @property
    def has_smtp_config(self) -> bool:
        return bool(
            self.settings.smtp_host
            and self.settings.smtp_host.strip()
            and self.settings.smtp_user
            and self.settings.smtp_user.strip()
        )

    async def _send_via_resend(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """Dispara e-mail via API HTTP da Resend."""
        api_key = self.settings.resend_api_key.strip() if self.settings.resend_api_key else ""
        from_name = self.settings.smtp_from_name or "Zaeron Contábil"
        from_email = self.settings.smtp_from_email or "suporte@zaeron.example"
        sender = f"{from_name} <{from_email}>" if from_name else from_email

        payload: dict[str, object] = {
            "from": sender,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }
        if text_content:
            payload["text"] = text_content

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(RESEND_API_URL, json=payload, headers=headers)
            if response.status_code in (200, 201):
                logger.info(
                    "transactional_email_sent provider=resend"
                )
                return True
            else:
                logger.error(
                    "transactional_email_failed provider=resend status=%s", response.status_code
                )
                return False

    async def _send_via_smtp(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """Dispara e-mail via conexão SMTP utilizando aiosmtplib."""
        if aiosmtplib is None:
            logger.error("[SMTP EMAIL ERRO] Pacote aiosmtplib não está disponível.")
            return False

        from_name = self.settings.smtp_from_name or "Zaeron Contábil"
        from_email = self.settings.smtp_from_email or "suporte@zaeron.example"
        sender = f"{from_name} <{from_email}>" if from_name else from_email

        msg = EmailMessage()
        msg["From"] = sender
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(text_content or "")
        msg.add_alternative(html_content, subtype="html")

        port = self.settings.smtp_port or 587
        use_ssl = bool(self.settings.smtp_use_tls and port == 465)
        start_tls = bool(self.settings.smtp_use_tls and port != 465)

        await aiosmtplib.send(
            msg,
            hostname=self.settings.smtp_host,
            port=port,
            username=self.settings.smtp_user,
            password=self.settings.smtp_password or "",
            use_tls=use_ssl,
            start_tls=start_tls,
            timeout=15.0,
        )
        logger.info(
            "transactional_email_sent provider=smtp"
        )
        return True

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """Envia e-mail utilizando Resend HTTP API ou SMTP, com fallback seguro."""
        # 1. Tentar Resend se configurado
        if self.has_resend_config:
            try:
                success = await self._send_via_resend(to_email, subject, html_content, text_content)
                if success:
                    return True
                logger.warning("Falha no envio via Resend. Tentando fallback para SMTP se configurado...")
            except Exception as exc:
                logger.error("transactional_email_exception provider=resend type=%s", type(exc).__name__)

        # 2. Tentar SMTP se configurado
        if self.has_smtp_config:
            try:
                success = await self._send_via_smtp(to_email, subject, html_content, text_content)
                if success:
                    return True
            except Exception as exc:
                logger.error("transactional_email_exception provider=smtp type=%s", type(exc).__name__)

        # 3. Fallback de Desenvolvimento / Offline
        if not self.has_resend_config and not self.has_smtp_config:
            logger.info(
                "transactional_email_skipped reason=provider_not_configured"
            )
            return True

        logger.error("transactional_email_failed provider=all")
        return False

    async def send_otp_email(self, to_email: str, code: str) -> bool:
        """Envia o código OTP de cadastro/verificação com o template corporativo Zaeron."""
        subject = f"Seu código de acesso Zaeron Contábil: {code}"
        html_content = build_otp_email_html(code)
        text_content = build_otp_email_text(code)
        try:
            return await self.send_email(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
            )
        except Exception as exc:
            logger.error("otp_email_failed type=%s", type(exc).__name__)
            return False


async def send_otp_email(to_email: str, code: str, settings: Optional[Settings] = None) -> bool:
    """Função de conveniência assíncrona para envio do código OTP."""
    mailer = MailerService(settings=settings)
    return await mailer.send_otp_email(to_email=to_email, code=code)
