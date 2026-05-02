# syntax=docker/dockerfile:1.7

FROM gradle:8-jdk21 AS build
WORKDIR /app
COPY . .
RUN gradle clean installDist --no-daemon

FROM eclipse-temurin:21-jre
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app \
    && useradd --system --gid app --uid 10001 --home-dir /app --shell /usr/sbin/nologin app
WORKDIR /app
COPY --from=build /app/build/install/souz-proxy ./
COPY public ./public
RUN chown -R app:app /app

USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD curl -fsS http://127.0.0.1:8080/ready || exit 1
CMD ["./bin/souz-proxy"]
