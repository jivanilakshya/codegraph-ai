FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    GIT_PYTHON_GIT_EXECUTABLE=/usr/bin/git

WORKDIR /app

RUN apt-get update \
    && apt-get install --no-install-recommends -y git \
    && git --version \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

RUN pip install --upgrade pip \
    && pip install --no-cache-dir --default-timeout=120 -r requirements.txt \
    && python -c "from git import Git; print(Git().version())"

COPY . ./

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--no-access-log", "--log-level", "warning"]