FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . /app

#Redundante pero lo dejo como ejemplo, el command del docker-compose.yml sobreescribe el CMD
#CMD ["gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000"]
