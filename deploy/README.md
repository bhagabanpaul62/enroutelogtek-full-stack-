# Deploying EnrouteLogtek to a VPS

One Ubuntu server runs four containers: Postgres, the backend, the frontend, and Caddy in front
of them for HTTPS. GitHub Actions builds the images on every push to `main` and deploys them.

```
Internet → Caddy :443 (HTTPS, automatic certificate)
             ├── /api/*  → backend:8000
             └── else    → frontend:3000
           backend → postgres (internal only)
```

You do steps 1 to 6 once. After that, a push to `main` deploys by itself.

## 1. DNS

At your domain provider, point the domain at the server:

| Type | Name | Value |
|---|---|---|
| A | `@` | your server's IPv4 |
| A | `www` | your server's IPv4 |

Check it from your Mac (can take up to an hour): `dig +short enroutelogtek.in` prints the IP.

## 2. The server (once, as root)

Ubuntu 22.04 or 24.04, 2 GB RAM or more.

```bash
ssh root@YOUR_SERVER_IP

# a user for deploys, allowed to run Docker
adduser --disabled-password --gecos "" deploy
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy

# firewall: SSH and the web only
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp
ufw --force enable

# the app folder
mkdir -p /opt/enroute/deploy /opt/enroute/backups
chown -R deploy:deploy /opt/enroute
```

Only Caddy publishes ports (80 and 443), so the database and the API are never reachable from
outside, firewall or not.

## 3. A deploy key for GitHub Actions (on your Mac)

```bash
ssh-keygen -t ed25519 -N "" -C "github-actions-deploy" -f ~/.ssh/enroute_deploy

# install the public key for the deploy user (logs in as root, since deploy has no password)
cat ~/.ssh/enroute_deploy.pub | ssh root@YOUR_SERVER_IP \
  "install -d -m 700 -o deploy -g deploy /home/deploy/.ssh && cat >> /home/deploy/.ssh/authorized_keys && chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys"

ssh -i ~/.ssh/enroute_deploy deploy@YOUR_SERVER_IP docker ps       # must work without a password
ssh-keyscan -H YOUR_SERVER_IP                                     # copy this output for step 5
```

## 4. The server's `.env` (once)

```bash
# from the repo folder on your Mac: send the template up as the server's .env
scp -i ~/.ssh/enroute_deploy .env.example deploy@YOUR_SERVER_IP:/opt/enroute/.env

ssh -i ~/.ssh/enroute_deploy deploy@YOUR_SERVER_IP
nano /opt/enroute/.env        # fill in the empty values (below), save with Ctrl+O, Enter, Ctrl+X
chmod 600 /opt/enroute/.env
```

- `POSTGRES_PASSWORD`: `openssl rand -hex 24`. `JWT_SECRET`: `openssl rand -hex 32`.
- `SITE_DOMAIN=enroutelogtek.in`, `FRONTEND_URL=https://enroutelogtek.in`,
  `NEXT_PUBLIC_APP_URL=https://enroutelogtek.in/api/v1`.
- Email (SMTP) and Cloudflare R2: your real values.
- This file is the only place the production secrets live. Back it up somewhere safe.

## 5. GitHub settings (once)

In the repository: **Settings → Environments → New environment → `production`**.

Environment **secrets**:

| Name | Value |
|---|---|
| `VPS_HOST` | your server's IP |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | the whole file `~/.ssh/enroute_deploy` (the private key, from `-----BEGIN` to `END-----`) |
| `VPS_KNOWN_HOSTS` | the `ssh-keyscan` output from step 3 |

Environment **variables**:

| Name | Value |
|---|---|
| `SITE_DOMAIN` | `enroutelogtek.in` |
| `NEXT_PUBLIC_APP_URL` | `https://enroutelogtek.in/api/v1` (must match the server `.env`) |
| `VPS_PORT` | only if SSH is not on port 22 |
| `APP_DIR` | only if the app folder is not `/opt/enroute` |

## 6. First deploy

Push to `main`, or open **Actions → Deploy → Run workflow**. The run:

1. checks the code (lint, build, migrations on a test database, an API smoke test),
2. builds the two images and stores them in GitHub's registry (GHCR),
3. copies the compose files to the server and runs `deploy/remote-deploy.sh` there,
4. waits until `https://enroutelogtek.in` answers.

The first deploy takes a few extra minutes while Caddy gets the certificate.

## Every day after that

| To | Do |
|---|---|
| Ship a change | Push to `main`. Pull requests and other branches get the checks only. |
| Roll back | **Actions → Deploy → Run workflow**, `image_tag` = an older commit SHA. The server's `deploy/history.log` lists what ran when. A rollback does not undo database migrations. |
| See logs | `cd /opt/enroute && docker compose -f docker-compose.yml -f docker-compose.vps.yml logs -f --tail 100 backend` |
| Restart | same folder: `docker compose -f docker-compose.yml -f docker-compose.vps.yml restart backend` |

## Approve a company (until the admin screen exists)

Every new company waits at "pending" and cannot log in. Approve one by its company email:

```bash
cd /opt/enroute
docker compose -f docker-compose.yml -f docker-compose.vps.yml exec postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "UPDATE companies SET company_status = '"'"'approved'"'"' WHERE company_email_id = '"'"'office@example.com'"'"';"'
```

## Check that email can leave the server

Some providers block outgoing mail ports. From the server:

```bash
nc -vz smtp.hostinger.com 465     # "succeeded" = fine; a timeout = ask the provider to open it
```

## Nightly database backup

`crontab -e` as `deploy`, then add (one line):

```
0 2 * * * cd /opt/enroute && docker compose -f docker-compose.yml -f docker-compose.vps.yml exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > backups/enroute-$(date +\%F).sql.gz && find backups -name '*.sql.gz' -mtime +14 -delete
```

This keeps 14 days on the server. Copy them off it too (a server that dies takes its backups
with it). Restore one:

```bash
gunzip -c backups/enroute-2026-11-08.sql.gz | docker compose -f docker-compose.yml -f docker-compose.vps.yml exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

## Without GitHub Actions

On the server, with the repo cloned into `/opt/enroute` and `.env` in place:

```bash
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build
```

This builds on the server itself (slower; needs about 2 GB of free RAM for the frontend build).
