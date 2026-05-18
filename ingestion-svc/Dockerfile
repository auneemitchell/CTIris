FROM python:3.11-slim

# psycopg[binary] needs gcc + libpq headers
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ctiris_db/ /opt/ctiris_db/
COPY ingestion-svc/requirements.txt ./
RUN pip install --no-cache-dir /opt/ctiris_db && pip install --no-cache-dir -r requirements.txt

COPY ingestion-svc/ .

CMD ["python", "scheduler.py"]
