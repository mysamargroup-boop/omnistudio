# Multi-Stage Production Dockerfile for OmniStudio AI Backend
FROM python:3.12-slim-bookworm

# Install hardware acceleration and FFmpeg dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install python dependencies with pip cache disabled
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Ensure outputs directory exists
RUN mkdir -p outputs/images outputs/videos outputs/audio outputs/final

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV HOST=0.0.0.0

# Healthcheck probe
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Launch uvicorn
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
