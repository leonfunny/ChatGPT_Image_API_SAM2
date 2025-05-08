FROM python:3.13-alpine

WORKDIR /app

COPY requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir --upgrade pip && pip install -r /app/requirements.txt

COPY . /app

COPY photo-fal-ai-e4cdcd153882.json /app/photo-fal-ai-e4cdcd153882.json

EXPOSE 8000

CMD ["uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]
