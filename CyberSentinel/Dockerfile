FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY backend /app/backend
COPY data /app/data

ENV FLASK_APP=backend.app
EXPOSE 5000

CMD ["gunicorn", "backend.app:app", "--bind", "0.0.0.0:5000", "--workers", "3"]
