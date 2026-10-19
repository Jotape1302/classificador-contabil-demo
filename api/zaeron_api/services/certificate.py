"""Geração de códigos e documentos de certificado Zaeron Certified."""

import datetime
import html
import os
import secrets
import urllib.parse

_PUBLIC_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"


def generate_public_code(groups: int = 4, group_size: int = 4) -> str:
    """Gera identificador público não sequencial usando fonte criptográfica."""
    if groups < 1 or group_size < 1:
        raise ValueError("groups e group_size devem ser positivos.")
    parts = [
        "".join(secrets.choice(_PUBLIC_CODE_ALPHABET) for _ in range(group_size))
        for _ in range(groups)
    ]
    return "ZAC-" + "-".join(parts)


def build_certificate_share_url(
    public_code: str, base_url: str | None = None
) -> str:
    """Monta o link que será atendido pela rota pública."""
    root = (
        base_url or os.getenv("PUBLIC_BASE_URL") or "https://zaeron.example"
    ).rstrip("/")
    query = urllib.parse.urlencode({"certificado": public_code})
    return f"{root}/?{query}"


def _format_duration(total_minutes: int) -> str:
    hours, minutes = divmod(max(int(total_minutes or 0), 0), 60)
    if hours and minutes:
        return f"{hours}h{minutes:02d}"
    if hours:
        return f"{hours}h"
    return f"{minutes}min"


def _format_date(value) -> str:
    if isinstance(value, (datetime.datetime, datetime.date)):
        return value.strftime("%d/%m/%Y")
    return str(value or "")


def render_certificate_html(
    *,
    recipient_name: str,
    course_title: str,
    duration_minutes: int,
    issued_at,
    public_code: str,
    course_version: str,
    verification_url: str | None = None,
) -> str:
    """Renderiza certificado completo, escapando todos os valores dinâmicos."""
    safe_name = html.escape(str(recipient_name or "").strip())
    safe_course = html.escape(str(course_title or "").strip())
    safe_duration = html.escape(_format_duration(duration_minutes))
    safe_date = html.escape(_format_date(issued_at))
    safe_code = html.escape(str(public_code or "").strip())
    safe_version = html.escape(str(course_version or "").strip())
    safe_url = html.escape(str(verification_url or "").strip(), quote=True)

    validation_block = ""
    if safe_url:
        validation_block = f"""
            <div class="validation">
                Validação: <a href="{safe_url}" target="_blank" rel="noopener">{safe_url}</a>
            </div>
        """

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Zaeron Certified — {safe_name}</title>
    <style>
        :root {{ color-scheme: light; }}
        * {{ box-sizing: border-box; }}
        body {{
            margin: 0;
            padding: 24px;
            background: #07111f;
            color: #0f172a;
            font-family: Inter, Arial, sans-serif;
        }}
        .actions {{ max-width: 1120px; margin: 0 auto 12px; text-align: right; }}
        .actions button {{
            border: 0;
            border-radius: 9px;
            padding: 10px 18px;
            color: white;
            background: linear-gradient(135deg, #2563eb, #06b6d4);
            font-weight: 700;
            cursor: pointer;
        }}
        .certificate {{
            position: relative;
            width: min(1120px, 100%);
            min-height: 720px;
            margin: 0 auto;
            overflow: hidden;
            border: 12px solid #0f2744;
            background:
                radial-gradient(circle at 85% 15%, rgba(14, 165, 233, .16), transparent 28%),
                radial-gradient(circle at 10% 90%, rgba(37, 99, 235, .12), transparent 32%),
                #ffffff;
            box-shadow: 0 24px 70px rgba(0, 0, 0, .35);
        }}
        .certificate::before {{
            content: "";
            position: absolute;
            inset: 16px;
            border: 2px solid #38bdf8;
            pointer-events: none;
        }}
        .content {{
            position: relative;
            z-index: 1;
            min-height: 696px;
            padding: 72px 84px 56px;
            text-align: center;
        }}
        .brand {{ color: #0f2744; font-size: 30px; font-weight: 900; letter-spacing: .08em; }}
        .brand span {{ color: #0284c7; }}
        .seal-label {{
            display: inline-block;
            margin-top: 22px;
            padding: 8px 18px;
            border-radius: 999px;
            background: #e0f2fe;
            color: #0369a1;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: .16em;
        }}
        h1 {{ margin: 34px 0 8px; color: #0f172a; font: 500 23px Georgia, serif; }}
        .recipient {{
            margin: 12px auto 18px;
            color: #0f2744;
            font: 700 clamp(34px, 5vw, 58px) Georgia, serif;
        }}
        .statement {{ max-width: 820px; margin: 0 auto; color: #475569; font-size: 19px; line-height: 1.7; }}
        .course {{ display: block; margin: 12px 0; color: #0369a1; font-size: 27px; font-weight: 800; }}
        .meta {{
            display: flex;
            justify-content: center;
            gap: 28px;
            flex-wrap: wrap;
            margin: 38px auto 0;
            color: #334155;
            font-size: 14px;
        }}
        .meta strong {{ display: block; margin-top: 4px; color: #0f172a; font-size: 17px; }}
        .footer {{ margin-top: 48px; }}
        .signature {{ width: 250px; margin: 0 auto; padding-top: 9px; border-top: 1px solid #64748b; color: #334155; }}
        .code {{ margin-top: 34px; color: #0f2744; font: 800 18px monospace; letter-spacing: .09em; }}
        .validation {{ margin: 10px auto 0; color: #64748b; font-size: 11px; overflow-wrap: anywhere; }}
        .validation a {{ color: #0369a1; }}
        @media print {{
            @page {{ size: A4 landscape; margin: 0; }}
            body {{ padding: 0; background: white; }}
            .actions {{ display: none; }}
            .certificate {{ width: 297mm; min-height: 210mm; border-width: 8px; box-shadow: none; }}
            .content {{ min-height: 202mm; }}
        }}
    </style>
</head>
<body>
    <div class="actions"><button onclick="window.print()">Imprimir / Salvar em PDF</button></div>
    <main class="certificate">
        <section class="content">
            <div class="brand">ZAERON <span>ACADEMY</span></div>
            <div class="seal-label">ZAERON CERTIFIED</div>
            <h1>Certificamos que</h1>
            <div class="recipient">{safe_name}</div>
            <p class="statement">
                concluiu com aproveitamento o curso
                <span class="course">{safe_course}</span>
                com carga horária de {safe_duration}, versão {safe_version}.
            </p>
            <div class="meta">
                <div>Emissão<strong>{safe_date}</strong></div>
                <div>Carga horária<strong>{safe_duration}</strong></div>
            </div>
            <div class="footer">
                <div class="signature">Zaeron Academy</div>
                <div class="code">{safe_code}</div>
                {validation_block}
            </div>
        </section>
    </main>
</body>
</html>
"""


__all__ = [
    "build_certificate_share_url",
    "generate_public_code",
    "render_certificate_html",
]
