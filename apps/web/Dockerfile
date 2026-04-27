FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency installation
RUN pip install uv

# Copy dependency files
COPY apps/web/pyproject.toml apps/web/uv.lock ./

# Install dependencies (base only — no AI extras in prod image by default)
RUN uv pip install --system -e ".[ai]"

# Copy application code
COPY apps/web/ .

# Collect static files
RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

CMD ["uvicorn", "purplesector.asgi:application", "--host", "0.0.0.0", "--port", "8000"]
