"""Snapshot estritamente público de um certificado."""

import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class PublicCertificateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["valid", "revoked"]
    recipient_name: str = Field(max_length=255)
    course_title: str = Field(max_length=255)
    duration_minutes: int | None = Field(default=None, ge=0)
    issued_at: datetime.datetime
    public_code: str = Field(max_length=64)
    seal: Literal["Zaeron Certified"] = "Zaeron Certified"

