FROM python:3.11-slim

WORKDIR /app

# Install curl needed by playwright install-deps
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright system dependencies + Chromium browser
RUN playwright install-deps chromium && playwright install chromium

# Copy backend source
COPY backend/ ./backend/

EXPOSE 8000

CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
