"""Módulo de Sanitização de Dados Pessoais Sensíveis (PII / LGPD) - Zaeron Contábil.

Responsável por ofuscar dados pessoais sensíveis (CPFs, e-mails, números de telefone
e chaves Pix aleatórias/formatadas) em descrições e históricos bancários antes do
processamento por modelos de linguagem e integrações externas, preservando integralmente
datas, valores monetários e redações contábeis essenciais.
"""

import re
from typing import Optional
import unicodedata

# Padrões Regex Pré-compilados para Alta Performance
RE_ZERO_WIDTH = re.compile(
    r"[\u200B-\u200D\uFEFF\u00AD\u2060\u200E\u200F\u0000-\u0008\u000B\u000C\u000E-\u001F]"
)

RE_PIX_UUID = re.compile(
    r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b",
    re.IGNORECASE,
)

RE_EMAIL = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
)

RE_CPF_ROTULADO = re.compile(
    r"\b(?P<label>CPF|DOC|DOCUMENTO)[\s:#-]+(?P<doc>\d{3}[._\s]?\d{3}[._\s]?\d{3}[-./_\s]?\d{2})\b",
    re.IGNORECASE,
)

RE_CPF_FORMATADO = re.compile(
    r"(?<![\d.,/])\b\d{3}[._\s-]\d{3}[._\s-]\d{3}[-./_\s]\d{2}\b(?![\d.,/])"
)

RE_TELEFONE_ROTULADO = re.compile(
    r"\b(?P<label>TEL|TELEFONE|CEL|CELULAR|FONE|WHATSAPP|WPP|CONTATO)[\s:#-]+(?P<tel>(?:\+?55\s*)?(?:\(?0?[1-9]{2}\)?\s*)?(?:9\s*)?\d{4,5}[-.\s]?\d{4})\b",
    re.IGNORECASE,
)

RE_TELEFONE_FORMATADO = re.compile(
    r"(?:(?:\+|00)55\s*(?:\(?0?[1-9]{2}\)?\s*)?(?:9\s*)?\d{4,5}[-.\s]?\d{4}\b)|"
    r"(?:\(?0?[1-9]{2}\)\s*(?:9\s*)?\d{4,5}[-.\s]?\d{4}\b)|"
    r"(?:\b0?[1-9]{2}\s+(?:9\s*)?\d{4,5}[-.\s]\d{4}\b)|"
    r"(?:\b(?:9\s*)?\d{4,5}[-.]\d{4}\b)"
)

RE_PIX_EXPLICITO = re.compile(
    r"\b(?P<label>(?:CHAVE\s+PIX|PIX\s+CHAVE|CHAVE\s+EVP|PIX\s+EVP|CHAVE\s+ALEAT[OÓ]RIA|PIX\s+ALEAT[OÓ]RI[OA]|PIX\s+CELULAR|PIX\s+TELEFONE|PIX\s+EMAIL|PIX\s+E-MAIL|PIX\s+CPF)(?:\s+(?:EMAIL|E-MAIL|CELULAR|TELEFONE|CPF|EVP|ALEAT[OÓ]RI[OA]))?)[\s:#-]+(?P<key>(?!(?:EMAIL|E-MAIL|CELULAR|TELEFONE|CPF|DOC|DOCUMENTO)\b)[^\s,;\[\]]+)",
    re.IGNORECASE,
)

RE_CPF_DIGITOS = re.compile(
    r"(?<![\d.,/])\b\d{11}\b(?![\d.,/])"
)


def sanitize_accounting_text(text: Optional[str]) -> str:
    """Ofusca dados pessoais sensíveis (PII) em textos de transações bancárias.

    Preserva integralmente datas, valores monetários e descrições contábeis.
    """
    if text is None:
        return ""
    try:
        raw_str = str(text)
        if not raw_str.strip():
            return ""

        cleaned = RE_ZERO_WIDTH.sub("", raw_str)
        cleaned = unicodedata.normalize("NFKC", cleaned)
        sanitized = re.sub(r"[\t\r\n]+", " ", cleaned).strip()

        if not sanitized:
            return ""

        # 1. Chaves Pix UUID
        sanitized = RE_PIX_UUID.sub("[CHAVE_PIX_PROTEGIDA]", sanitized)

        # 2. E-mails
        sanitized = RE_EMAIL.sub("[EMAIL_PROTEGIDO]", sanitized)

        # 3. CPFs com rótulo explícito
        sanitized = RE_CPF_ROTULADO.sub(r"\g<label> [CPF_PROTEGIDO]", sanitized)

        # 4. CPFs com pontuação padrão
        sanitized = RE_CPF_FORMATADO.sub("[CPF_PROTEGIDO]", sanitized)

        # 5. Telefones com rótulo
        sanitized = RE_TELEFONE_ROTULADO.sub(r"\g<label> [TEL_PROTEGIDO]", sanitized)

        # 6. Telefones formatados
        sanitized = RE_TELEFONE_FORMATADO.sub("[TEL_PROTEGIDO]", sanitized)

        # 7. Chaves Pix explícitas restantes
        sanitized = RE_PIX_EXPLICITO.sub(r"\g<label> [CHAVE_PIX_PROTEGIDA]", sanitized)

        # 8. CPFs de 11 dígitos numéricos isolados
        sanitized = RE_CPF_DIGITOS.sub("[CPF_PROTEGIDO]", sanitized)

        sanitized = re.sub(r"\s+", " ", sanitized).strip()
        return sanitized
    except Exception:
        return "[ERRO_SANITIZACAO]"


__all__ = ["sanitize_accounting_text"]
