"""Consultas públicas com contrato explicitamente sanitizado."""

import json
import re
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.zaeron_api.core.errors import APIError
from api.zaeron_api.dependencies.database import get_db
from api.zaeron_api.repositories.certificates import CertificateRepository
from api.zaeron_api.schemas.certificate import PublicCertificateResponse


router = APIRouter(prefix="/public", tags=["public"])
_PUBLIC_CODE_PATTERN = re.compile(
    r"^ZAC-[23456789A-HJ-NP-Z]{4}(?:-[23456789A-HJ-NP-Z]{4}){3}$"
)
_CONTENT_ROOT = Path(__file__).resolve().parents[1] / "content"
_FALLBACK_CONTENT_ROOT = (
    Path(__file__).resolve().parents[3] / "app" / "academy" / "content"
)
_COURSE_ROOT = (
    _CONTENT_ROOT
    if (_CONTENT_ROOT / "ia_rotina_contabil").exists()
    else _FALLBACK_CONTENT_ROOT
)


def _normalize_public_code(value: str) -> str | None:
    normalized = str(value or "").strip().upper()
    return normalized if _PUBLIC_CODE_PATTERN.fullmatch(normalized) else None


def _course_duration(course_key: str, course_version: str) -> int | None:
    # O course_key nunca é usado diretamente como caminho sem esta whitelist.
    course_manifests = {
        "ia_rotina_contabil": _COURSE_ROOT / "ia_rotina_contabil" / "course.json",
    }
    manifest_path = course_manifests.get(course_key)
    if manifest_path is None:
        return None
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if manifest.get("version") != course_version:
            return None
        return int(manifest["estimated_duration_minutes"])
    except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError):
        return None


@router.get(
    "/certificates/{code}",
    response_model=PublicCertificateResponse,
)
def get_public_certificate(code: str, db: Session = Depends(get_db)):
    normalized_code = _normalize_public_code(code)
    if normalized_code is None:
        raise APIError(404, "Certificado não encontrado.", "certificate_not_found")
    certificate = CertificateRepository(db).get_by_public_code(normalized_code)
    if certificate is None:
        raise APIError(404, "Certificado não encontrado.", "certificate_not_found")

    return PublicCertificateResponse(
        status="revoked" if certificate.revoked_at is not None else "valid",
        recipient_name=certificate.recipient_name,
        course_title=certificate.course_title,
        duration_minutes=_course_duration(
            certificate.course_key,
            certificate.course_version,
        ),
        issued_at=certificate.issued_at,
        public_code=certificate.public_code,
    )

