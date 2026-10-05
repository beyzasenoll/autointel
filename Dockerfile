FROM python:3.11-slim

WORKDIR /app

COPY ingestion/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY ingestion/ ./ingestion/

CMD ["python", "ingestion/load_nhtsa.py"]
