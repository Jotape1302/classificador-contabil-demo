"""Respostas transversais da API."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, StrictStr


class MessageResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: StrictStr


class LiveHealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"] = "ok"
    service: Literal["zaeron-api"] = "zaeron-api"


class ReadyHealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ready"] = "ready"
    database: Literal["connected"] = "connected"

