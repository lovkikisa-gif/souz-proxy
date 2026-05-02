FROM gradle:8-jdk21 AS build
WORKDIR /app
COPY . .
RUN gradle installDist --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/install/souz-proxy ./

# Copy the externally built frontend into the public directory
COPY frontend/dist ./public

EXPOSE 8080
CMD ["./bin/souz-proxy"]
