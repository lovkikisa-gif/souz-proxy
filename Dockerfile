FROM gradle:8-jdk21 AS build
WORKDIR /app
COPY . .
RUN gradle installDist --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/install/souz-proxy ./

# Create a public directory (frontend should be copied here later)
RUN mkdir public

EXPOSE 8080
CMD ["./bin/souz-proxy"]
