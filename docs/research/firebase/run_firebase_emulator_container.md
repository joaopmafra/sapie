# Run Firebase Emulator in a Container

You can run the Firebase Emulator Suite in a container *using either a pre-built Docker image or by creating your own custom Dockerfile and using Docker Compose*. This approach ensures consistency across environments and simplifies CI/CD integration.

## Option 1: Using a Pre-built Docker Image

The simplest way is to use a public image like `spine3/firebase-emulator` or `tomasvotava/firebase-emulators`, which abstracts away the manual installation of dependencies.


Run the following command in your terminal, replacing `<your-gcp-project>` with your project ID:

```bash
docker run \
  --rm \
  -p=9000:9000 \
  -p=8080:8080 \
  -p=4000:4000 \
  -p=9099:9099 \
  --env "GCP_PROJECT=<your-gcp-project>" \
  --env "ENABLE_UI=true" \
  spine3/firebase-emulator
```

- **`-p` flags** map the container ports to your local machine (e.g., UI on 4000, Firestore on 8080, Auth on 9099).
- **`--env "GCP_PROJECT"`** is a required environment variable for the project ID.
- **`--rm`** automatically removes the container when it exits.
- You can access the Emulator UI at `http://localhost:4000` in your web browser.

## Option 2: Using Docker Compose with a Custom Dockerfile

For more control, especially when incorporating Cloud Functions or specific project configurations, create a custom setup with a `Dockerfile` and `docker-compose.yml` file in your project's root directory.

1. **Create `Dockerfile`**: This installs the Firebase CLI and necessary dependencies (like JDK for emulators).

```dockerfile
FROM node:18-alpine
RUN apk add --no-cache openjdk11 bash curl
RUN npm install -g firebase-tools
# Copy project files into the container
COPY .. /srv/firebase
WORKDIR /srv/firebase
# Expose emulator ports (adjust as needed)
EXPOSE 4000 8080 9099 5001
# Command to start the emulators
CMD ["firebase", "emulators:start", "--project", "${FB_PROJECT_ID}"]
```

2. **Create `docker-compose.yml`**: This orchestrates the container, maps ports, sets environment variables, and manages volumes for data persistence.

```yaml
version: '3.1'
services:
    firebase-emulator:
    container_name: firebase-emulator
    build:
        context: .
        dockerfile: Dockerfile
    ports:
        - "4000:4000" # Emulator UI
        - "8080:8080" # Firestore
        - "9099:9099" # Auth
        - "5001:5001" # Functions
    environment:
        - FB_PROJECT_ID=dummy-project # Use a demo project ID
    volumes:
        # Mount local project directory to container's workdir
        - ./:/srv/firebase
```

3. **Run with Docker Compose**: Navigate to your project directory and run the command:

```bash
docker compose up --build
```

## Persisting Data

To save your emulated data between sessions, use the `--import` and `--export-on-exit` flags in your start command, combined with a Docker volume. Update the `CMD` in the `Dockerfile` to:

```dockerfile
CMD ["sh", "-c", "firebase emulators:start --import=/srv/firebase/data-local-dev/ --export-on-exit=/srv/firebase/data-local-dev/ --project=${FB_PROJECT_ID}"]
```

Ensure a `data` directory exists locally and is mounted as a volume in your `docker-compose.yml`.