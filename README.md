# CTIris
Capstone Project for North Seattle College CS BS Program

## Table Of Contents
1. [Run Docker](#run-hello-docker-using-docker-compose)
2. [Contributing](#contributing)
3. [License](#license)

## Run with Docker Compose

In the base directory:

### Start
```bash
docker compose up --build
```

Notes:
- Builds all service images and starts them
- Startup order: `postgres` → `db-svc` → `ingestion-svc`
- `-d` flag runs services in the background; omit `--build` on subsequent runs if no code changed

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
| `ingestion-svc` | Polls MITRE ATT&CK TAXII, upserts STIX objects into Postgres | [ingestion-svc/README.md](ingestion-svc/README.md) |

## Contributing
**Project Manager:** Aune Mitchell

**Developers:**
- Jovy Ann Nelson
- Kayla Rieck
- Sandra Gran
- Aune Mitchell

## License
This project is licensed under the MIT License. Please refer to the [LICENSE]() for more details.
