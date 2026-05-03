# VPS Setup

This stack is intended to be built locally. The VPS only receives prebuilt Docker images and starts them; it does not need enough CPU or RAM to run Gradle or frontend builds.

## Install Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg ufw
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
```

Log out and back in over SSH after adding your user to the `docker` group.

## Upload The Bundle

```bash
sudo mkdir -p /opt/souz
sudo chown "$USER:$USER" /opt/souz
cd /opt/souz
```

From your local machine:

```bash
scp dist/* user@server:/opt/souz/
```

Or automate the whole upload/start flow from your workstation:

```bash
cd /Users/duxx/IdeaProjects/souz-proxy
cp deploy/deploy.env.example deploy/deploy.env
cp deploy/.env.example deploy/.env
./deploy/deploy-vm.sh
```

On the server:

```bash
cd /opt/souz
cp env.example .env
nano .env
./load-and-run.sh
```

## Configure Caddy

```bash
sudo apt install -y caddy
sudo nano /etc/caddy/Caddyfile
```

```caddyfile
your-domain.com {
  reverse_proxy 127.0.0.1:8080
}
```

```bash
sudo systemctl reload caddy
```

## Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```
