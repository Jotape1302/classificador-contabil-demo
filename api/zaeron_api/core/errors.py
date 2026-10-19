"""Erros de domínio e respostas HTTP sem vazamento de detalhes internos."""

import logging
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("zaeron_api.errors")


class APIError(Exception):
    def __init__(self, status_code: int, detail: str, code: str, extra: dict | None = None):
        self.status_code = status_code
        self.detail = detail
        self.code = code
        self.extra = extra or {}
        super().__init__(detail)


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def handle_api_error(_: Request, exc: APIError) -> JSONResponse:
        content = {"detail": exc.detail, "code": exc.code}
        if exc.code == "LIMIT_REACHED":
            content["error"] = "LIMIT_REACHED"
            content["message"] = exc.detail
        if exc.extra:
            content.update(exc.extra)
        return JSONResponse(
            status_code=exc.status_code,
            content=content,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        safe_errors = [
            {
                "location": list(error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            }
            for error in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={
                "detail": "Dados de entrada inválidos.",
                "code": "validation_error",
                "errors": safe_errors,
            },
        )

    @app.exception_handler(Exception)
    async def handle_unhandled_error(request: Request, exc: Exception) -> JSONResponse:
        # Exceções podem carregar parâmetros pessoais ou credenciais no texto.
        logger.error(
            "unhandled_exception path=%s type=%s",
            request.url.path,
            type(exc).__name__,
        )
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Erro interno do servidor.",
                "code": "internal_server_error",
            },
        )
