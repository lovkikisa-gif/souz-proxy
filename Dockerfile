# syntax=docker/dockerfile:1.7

# Stage 1: Build web app shipped with the proxy repo.
FROM node:20 AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build proxy
FROM gradle:8-jdk21 AS proxy-build
WORKDIR /app
COPY . .
RUN gradle installDist --no-daemon

# Stage 3: Final image
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=proxy-build /app/build/install/souz-proxy ./
COPY public-root ./public-root
COPY --from=frontend-build /frontend/dist ./public

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD curl -fsS http://127.0.0.1:8080/health || exit 1
CMD ["./bin/souz-proxy"]
