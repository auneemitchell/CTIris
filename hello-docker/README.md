# Hello World

Test microservice for learning purposes. Built with buildx -
 images exist for both AMD64 and ARM64 architectures.

## Prerequisites

Docker is [installed](https://docs.docker.com/get-docker/).

Container can be built using these instructions, or in the base directory with Docker Compose. See base
directory README for Docker Compose instructions.

## 1. Run the Image

### EITHER: Run the Pre-Built Image

`docker run -d -p 8080:8080 --name my-hello alephnaaught/hello-docker:v1.0`

### OR: Build and Run Locally

In the `hello-docker` directory:

```bash
docker build -t hello-docker .
docker run -d -p 8080:8080 --name my-hello hello-docker
```

Notes:

- The pre-built image is retrieved from the DockerHub registry
- `-d` runs the container in the background
- `-p` maps the port of the container to the port of the local machine
- `--name` gives the container a name so you can use the name instead of its containerID
- `-t` hello-docker tags the image with a name so it can be referenced by name
  rather than image ID.

## 2. Verify it's working

Should return: Hello World!

```bash
curl http://localhost:8080
```

## Stop the Container

```bash
docker stop my-hello
docker rm my-hello
```

Notes:
- `stop` sends a signal to the running process to shut down gracefully. Container
  still exists and can be restarted at this point.
- `rm` deletes the container entirely. Container cannot be restarted at this
  point. The image is unaffected and can be used to create a new container. 