FROM python:3.12-slim

WORKDIR /app

# Copy migration project and install db-svc package dependencies.
COPY . /app
RUN pip install --no-cache-dir /app

# Run schema migrations, then seed location objects if not already present.
CMD ["sh", "-c", "alembic upgrade head && python seed_locations.py"]
