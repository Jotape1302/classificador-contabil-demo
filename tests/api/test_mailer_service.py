"""Testes unitários e de integração para o serviço de e-mail transacional (MailerService)."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.zaeron_api.core.config import Settings
from api.zaeron_api.services.mailer import (
    MailerService,
    build_otp_email_html,
    build_otp_email_text,
    send_otp_email,
)


def test_template_rendering():
    code = "789123"
    html = build_otp_email_html(code)
    text = build_otp_email_text(code)

    # Asserções de layout e identidade visual Zaeron
    assert "789123" in html
    assert "Confirmação de Cadastro" in html
    assert "#C8753D" in html  # Cobre primário
    assert "#F08A3E" in html  # Laranja de ação
    assert "#090B0D" in html  # Fundo primário escuro
    assert "Este código expira em <strong>15 minutos</strong>" in html
    assert "ZAERON" in html

    # Asserções de texto puro
    assert "789123" in text
    assert "Este código expira em 15 minutos" in text
    assert "Zaeron Contábil" in text


def test_offline_dev_fallback():
    settings = Settings(
        resend_api_key=None,
        smtp_host=None,
        smtp_user=None,
    )
    mailer = MailerService(settings=settings)
    assert mailer.has_resend_config is False
    assert mailer.has_smtp_config is False

    success = asyncio.run(mailer.send_otp_email("test@zaeron.test", "123456"))
    assert success is True


def test_resend_api_success():
    settings = Settings(
        resend_api_key="re_test_key_12345",
        smtp_from_email="suporte@zaeron.example",
        smtp_from_name="Zaeron Contábil",
    )
    mailer = MailerService(settings=settings)
    assert mailer.has_resend_config is True

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"id": "resend_msg_001"}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        success = asyncio.run(mailer.send_otp_email("cliente@empresa.com", "654321"))

        assert success is True
        mock_post.assert_called_once()
        call_kwargs = mock_post.call_args.kwargs
        assert "https://api.resend.com/emails" == mock_post.call_args.args[0]
        assert call_kwargs["headers"]["Authorization"] == "Bearer re_test_key_12345"
        assert call_kwargs["json"]["to"] == ["cliente@empresa.com"]
        assert "654321" in call_kwargs["json"]["subject"]
        assert "654321" in call_kwargs["json"]["html"]


def test_resend_failure_fallback_to_smtp():
    settings = Settings(
        resend_api_key="re_invalid_key",
        smtp_host="smtp.zaeron.example",
        smtp_port=587,
        smtp_user="smtp_user",
        smtp_password="smtp_password",
        smtp_use_tls=True,
    )
    mailer = MailerService(settings=settings)
    assert mailer.has_resend_config is True
    assert mailer.has_smtp_config is True

    # Resend retorna erro 401
    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.text = "Unauthorized"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post, \
         patch("aiosmtplib.send", new_callable=AsyncMock) as mock_smtp_send:
        mock_post.return_value = mock_response
        mock_smtp_send.return_value = ({"cliente@empresa.com": (250, "OK")}, "OK")

        success = asyncio.run(mailer.send_otp_email("cliente@empresa.com", "999888"))
        assert success is True
        mock_post.assert_called_once()
        mock_smtp_send.assert_called_once()
        smtp_kwargs = mock_smtp_send.call_args.kwargs
        assert smtp_kwargs["hostname"] == "smtp.zaeron.example"
        assert smtp_kwargs["port"] == 587
        assert smtp_kwargs["username"] == "smtp_user"
        assert smtp_kwargs["password"] == "smtp_password"
        assert smtp_kwargs["start_tls"] is True


def test_smtp_success():
    settings = Settings(
        resend_api_key=None,
        smtp_host="smtp.mailtrap.io",
        smtp_port=587,
        smtp_user="user123",
        smtp_password="pass123",
        smtp_use_tls=True,
    )
    mailer = MailerService(settings=settings)
    assert mailer.has_resend_config is False
    assert mailer.has_smtp_config is True

    with patch("aiosmtplib.send", new_callable=AsyncMock) as mock_smtp_send:
        mock_smtp_send.return_value = ({}, "OK")
        success = asyncio.run(mailer.send_otp_email("destino@teste.com", "111222"))
        assert success is True
        mock_smtp_send.assert_called_once()


def test_smtp_ssl_port_465():
    settings = Settings(
        resend_api_key=None,
        smtp_host="smtp.gmail.com",
        smtp_port=465,
        smtp_user="user465",
        smtp_password="pass465",
        smtp_use_tls=True,
    )
    mailer = MailerService(settings=settings)

    with patch("aiosmtplib.send", new_callable=AsyncMock) as mock_smtp_send:
        mock_smtp_send.return_value = ({}, "OK")
        success = asyncio.run(mailer.send_otp_email("destino@teste.com", "333444"))
        assert success is True
        mock_smtp_send.assert_called_once()
        smtp_kwargs = mock_smtp_send.call_args.kwargs
        assert smtp_kwargs["use_tls"] is True
        assert smtp_kwargs["start_tls"] is False


def test_network_exception_does_not_raise():
    settings = Settings(
        resend_api_key="re_test_error",
        smtp_host=None,
        smtp_user=None,
    )
    mailer = MailerService(settings=settings)

    with patch("httpx.AsyncClient.post", side_effect=Exception("Connection timed out")):
        success = asyncio.run(mailer.send_otp_email("fail@teste.com", "555666"))
        assert success is False
