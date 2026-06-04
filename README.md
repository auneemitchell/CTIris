# CTIris
Capstone Project for North Seattle College CS BS Program

## Table Of Contents
1. [Introduction](#introduction)
2. [Objective](#objective)
3. [Installation](#installation)
4. [Contributing](#contributing)
5. [License](#license)

## Introduction

CTIris is an open-source Cyber Threat Intelligence (CTI) dashboard for students and hobbyists who want to explore real-world threat intelligence data. It ingests data from STIX/TAXII feeds (the standard formats for sharing threat intelligence) and makes that data visual and searchable, no enterprise tools or security background required.

<!-- TODO: Add screenshot here -->

## Objective

Most CTI platforms are built for professional analysts, they're expensive, complex, and assume a lot of prior knowledge. CTIris aims to lower that barrier with a locally-deployable dashboard that lets beginners dig into threat actor activity, indicators of compromise (IoCs), and MITRE ATT&CK technique coverage. Tooltips throughout the UI help explain terminology as you go.

## Installation

### Install Docker

This project runs entirely in Docker, so you'll need it installed before getting started.

- **Mac / Windows** — Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux** — Follow the [Docker Engine install guide](https://docs.docker.com/engine/install/) for your distro, then install the [Compose plugin](https://docs.docker.com/compose/install/linux/)

Once installed, verify it's working:

```bash
docker --version
docker compose version
```

### Start
From the repo root, for first run or after updates:

```bash
docker compose up --build
```

To rebuild and run in the background:

```bash
docker compose up --build -d
```

Or to start without rebuilding (subsequent runs, no code changes):

```bash
docker compose up -d
```

Once running, open **http://localhost:5173** in your browser to run the dashboard.

Notes:
- Startup order: `postgres` → `db-svc` → `ingestion-svc`
- `-d` runs services in the background (detached mode)

### Stop
```bash
docker compose down
```

Notes:
- Stops and removes all containers. The `postgres-data` volume is preserved so data survives restarts.
- Add `-v` to also wipe the database: `docker compose down -v`

## Services

| Service | Description | Docs |
|---|---|---|
| `postgres` | PostgreSQL database storing all CTI data | — |
| `db-svc` | Runs Alembic migrations on startup | [db-svc/README.md](db-svc/README.md) |
| `ingestion-svc` | Polls MITRE ATT&CK TAXII, upserts STIX objects into Postgres | [ingestion-svc/README.md](ingestion-svc/README.md) |
| `query-svc` | FastAPI read-only API serving the frontend | [query-svc/README.md](query-svc/README.md) |
| `gateway` | Nginx reverse proxy — routes `/api/*` to `query-svc` | — |
| `frontend` | React + TypeScript dashboard | [frontend/README.md](frontend/README.md) |

## Contributing
**Project Manager:** Aune Mitchell

**Developers:**
- Jovy Ann Nelson
- Kayla Rieck
- Sandra Gran
- Aune Mitchell

## License
This project is licensed under the MIT License. Please refer to the [LICENSE]() for more details.
