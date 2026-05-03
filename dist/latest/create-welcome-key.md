```bash
# 1. Generate a raw invite key
RAW_KEY="$(openssl rand -base64 24)"
echo "$RAW_KEY"

# 2. Hash it locally or on the server
./hash-welcome-key.sh "$RAW_KEY"

# 3. Insert the hash into proxy DB
docker compose --env-file .env -f deploy/docker-compose.prod.yml exec proxy-db \
  psql -U souz_proxy -d souz_proxy
```

```sql
insert into welcome_keys (key_hash, expires_at, comment)
values ('PASTE_HASH_HERE', now() + interval '30 days', 'first invite');
```
