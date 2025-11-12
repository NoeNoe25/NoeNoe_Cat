# ===== Stage 1: Builder =====
FROM python:3.12-slim AS builder

# Set working directory
WORKDIR /app

# Copy requirements first for better build caching
COPY requirements.txt ./

# Install Python dependencies into /install (not global)
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt

# ===== Stage 2: Runtime =====
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy installed dependencies from builder
COPY --from=builder /install /usr/local

# Copy application files
COPY . .

# Expose ports (vosk=2700, gemini=8765, fastapi=8000)
EXPOSE 2700
EXPOSE 8765
EXPOSE 8008

# Start only FastAPI - it will start the WebSocket servers automatically
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8008"]