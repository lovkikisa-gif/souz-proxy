# Production Deploy

```bash
cp deploy/.env.example .env
openssl rand -base64 48
docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d
docker compose --env-file .env -f deploy/docker-compose.prod.yml ps
```

Fill every required secret in `.env` before the first startup. The production compose file intentionally uses `${VAR:?error}` guards so the deployment fails fast when a secret is missing.

The backend now requires both `SOUZ_MASTER_KEY` and `TELEGRAM_TOKEN_ENCRYPTION_KEY`. Keep them stable across restarts and deploys, otherwise encrypted provider keys and Telegram bot bindings may become unreadable.

For low-resource VPS targets, build and export images locally, then either upload `dist/` manually or use `./deploy/deploy-vm.sh` to build, upload, install Docker/Caddy if needed, and start the stack remotely without compiling anything on the VM. The deploy pipeline packages only the proxy app and backend stack; the public landing site is expected to be deployed separately.

```bash
cp deploy/deploy.env.example deploy/deploy.env
cp deploy/.env.example deploy/.env
./deploy/deploy-vm.sh
```

When the VM still uses password-based SSH access, `./deploy/deploy-vm.sh` prompts for the SSH password once at the start and reuses the same control connection for the remaining `ssh` and `scp` steps.

Do not rotate SOUZ_MASTER_KEY without a key migration plan. Existing user-managed provider keys may become undecryptable.
