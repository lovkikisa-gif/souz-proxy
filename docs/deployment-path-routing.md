# Deployment Path Routing

## Overview

Production deployment uses Nginx as a reverse proxy in front of the souz-proxy container.

- `souz.app/` — landing page, served separately from `/var/www/souz-web/`
- `souz.app/app/**` — web app, served by proxy container
- `souz.app/auth/**` — auth API, handled by proxy container
- `souz.app/v1/**` — backend API, proxied by proxy container to backend

## Container Binding

Proxy container listens on `127.0.0.1:8080` (local only, not exposed to the internet).

Backend container is on a private Docker network — no public port.

## Nginx Configuration

```nginx
# Landing page
location / {
    root /var/www/souz-web;
    try_files $uri $uri/ =404;
}

# Redirect /app to /app/
location = /app {
    return 301 /app/;
}

# Web app (SPA)
location ^~ /app/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Auth API
location ^~ /auth/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Backend API + WebSocket
location ^~ /v1/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

## Docker Compose

```yaml
ports:
  - "127.0.0.1:8080:8080"  # local only
```
