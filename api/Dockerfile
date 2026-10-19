FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app

WORKDIR /app

RUN groupadd --system zaeron \
    && useradd --system --gid zaeron --home-dir /app --shell /usr/sbin/nologin zaeron

COPY api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --requirement /tmp/requirements.txt \
    && rm -f /tmp/requirements.txt

COPY --chown=zaeron:zaeron api /app/api
COPY --chown=zaeron:zaeron alembic /app/alembic
COPY --chown=zaeron:zaeron alembic.ini /app/alembic.ini

USER zaeron

EXPOSE 8000

HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=5 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health/live', timeout=3).read()"]

CMD ["uvicorn", "api.zaeron_api.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]
