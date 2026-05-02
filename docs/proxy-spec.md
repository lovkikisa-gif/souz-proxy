Ниже — финальная MVP-спецификация proxy с учётом решений:

* регистрация только по welcome-ключу;
* роли не нужны;
* admin UI не нужен;
* proxy-level quota не нужен;
* audit log не нужен;
* backend закрыт от интернета и доступен только proxy;
* browser app и proxy живут в одном docker container.

---

# Спецификация: Souz Web/Auth Proxy MVP

## 1. Назначение

Proxy — публичный сервис между браузерным приложением и приватным Souz backend agent.

Proxy отвечает за:

1. выдачу static frontend приложения;
2. регистрацию пользователя по welcome-ключу;
3. login/logout;
4. хранение пользователей, welcome-ключей и сессий в собственной proxy DB;
5. проверку browser session cookie;
6. проксирование `/v1/**` запросов в backend;
7. проксирование WebSocket `/v1/chats/{chatId}/ws`;
8. добавление trusted identity headers для backend;
9. защиту backend от прямого доступа из интернета.

Backend в PR уже ожидает trusted-proxy модель: `/v1/**` маршруты требуют `X-Souz-Proxy-Auth` и `X-User-Id`; при отсутствии или неверном proxy token backend возвращает ошибки вроде `backend_misconfigured`, `untrusted_proxy`, `missing_user_identity`, `invalid_user_identity`. ([GitHub][1])

---

## 2. Целевая архитектура

```text
Internet
  |
  v
[Browser]
  |
  HTTPS / WSS
  |
  v
[web-proxy container]
  - static frontend
  - auth API
  - reverse proxy to backend
  - proxy DB connection
  |
  private docker network
  |
  v
[souz-backend container]
  - /health
  - /v1/**
  - WebSocket events
  |
  private docker network
  |
  v
[backend-db container]
```

Отдельно:

```text
[proxy-db container]
  - users
  - welcome_keys
  - sessions
```

Backend container **не публикует порт наружу**. В `docker-compose` у backend должен быть `expose`, но не должен быть `ports`.

---

## 3. Не входит в MVP

В MVP не реализуем:

```text
roles
admin UI
audit log
proxy-level quota
request body hash
admin API
user management UI
```

Админские действия выполняются напрямую через proxy DB:

```text
создать welcome-key
отключить пользователя
отозвать сессию
посмотреть пользователей
```

---

# 4. Компоненты

## 4.1. Web/Auth Proxy

Один публичный container.

Отвечает за:

```text
GET /                       -> frontend index.html
GET /assets/*               -> frontend assets
GET /healthz                -> healthcheck самого proxy

POST /auth/welcome/verify   -> проверка welcome-ключа
POST /auth/signup           -> создание аккаунта
POST /auth/login            -> вход
POST /auth/logout           -> выход
GET  /auth/me               -> текущий пользователь

/v1/**                      -> authenticated reverse proxy to backend
/v1/chats/{chatId}/ws       -> authenticated WebSocket proxy to backend
```

## 4.2. Souz Backend

Приватный backend agent.

Текущие backend routes из PR включают `/v1/bootstrap`, `/v1/me/settings`, `/v1/me/provider-keys`, `/v1/chats`, `/v1/options`, chat messages, events, WebSocket, cancel-active и cancel-execution. ([GitHub][2])

Backend сам хранит:

```text
chats
messages
executions
events
provider keys
user settings
```

Proxy не должен дублировать эти данные.

## 4.3. Proxy DB

Хранит только:

```text
users
welcome_keys
sessions
```

Audit log не нужен.

---

# 5. Auth flow

## 5.1. Signup по welcome-ключу

```text
1. Пользователь открывает /signup.
2. Вводит welcome-key.
3. Frontend вызывает POST /auth/welcome/verify.
4. Proxy проверяет ключ в proxy DB.
5. Если ключ валиден, frontend показывает форму:
   - username
   - password
   - confirmPassword
6. Frontend вызывает POST /auth/signup.
7. Proxy в одной транзакции:
   - блокирует welcome_key через SELECT ... FOR UPDATE;
   - проверяет, что ключ не использован и не истёк;
   - создаёт user;
   - помечает welcome_key как used;
   - создаёт session;
8. Proxy выставляет HttpOnly session cookie.
9. Пользователь попадает в приложение.
```

Welcome-key не отправляется в backend.

---

## 5.2. Login

```text
1. Пользователь вводит username/password.
2. Frontend вызывает POST /auth/login.
3. Proxy ищет user по username.
4. Проверяет password_hash.
5. Проверяет, что disabled_at is null.
6. Создаёт новую session.
7. Выставляет HttpOnly cookie.
```

---

## 5.3. Logout

```text
1. Frontend вызывает POST /auth/logout.
2. Proxy находит текущую session.
3. Ставит revoked_at = now().
4. Удаляет cookie через Set-Cookie Max-Age=0.
```

---

## 5.4. Authenticated `/v1/**`

```text
1. Browser вызывает /v1/** с session cookie.
2. Proxy проверяет session.
3. Proxy удаляет опасные browser-provided headers.
4. Proxy добавляет trusted headers:
   - X-User-Id
   - X-Souz-Proxy-Auth
5. Proxy отправляет запрос в souz-backend.
6. Backend использует X-User-Id как trusted user identity.
```

Backend route code использует `requireUserIdFromTrustedProxy()` для chat/settings/provider/message/event/option операций, то есть пользовательская идентичность приходит именно из trusted proxy layer. ([GitHub][3])

---

# 6. Proxy public API

## 6.1. `GET /healthz`

Healthcheck proxy.

### Response

```json
{
  "status": "ok"
}
```

Опционально можно добавить проверку proxy DB и backend `/health`, но для MVP достаточно проверить, что proxy process жив.

---

## 6.2. `POST /auth/welcome/verify`

Проверяет welcome-key.

### Request

```json
{
  "welcomeKey": "souz-welcome-example-key"
}
```

### Success response

```json
{
  "valid": true
}
```

### Error response

```json
{
  "error": {
    "code": "invalid_welcome_key",
    "message": "Welcome key is invalid, expired or already used."
  }
}
```

### Правила

Proxy должен считать ключ невалидным, если:

```text
ключ не найден
ключ уже использован
expires_at <= now()
```

Для security лучше возвращать одинаковую ошибку для всех случаев.

---

## 6.3. `POST /auth/signup`

Создаёт пользователя.

### Request

```json
{
  "welcomeKey": "souz-welcome-example-key",
  "username": "dmitry",
  "password": "correct horse battery staple",
  "confirmPassword": "correct horse battery staple"
}
```

### Success response

```json
{
  "user": {
    "id": "6f2a61a4-4bb9-4f2f-85fc-6019d0a5f7c1",
    "username": "dmitry"
  }
}
```

Также proxy выставляет cookie:

```http
Set-Cookie: souz_session=<opaque-session-token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
```

### Validation

```text
welcomeKey required
username required
username unique
password required
confirmPassword required
password == confirmPassword
password length >= 8
password length <= 128
```

### Username format

Рекомендация для MVP:

```text
allowed: a-z, A-Z, 0-9, underscore, dash, dot
min length: 3
max length: 32
case-insensitive uniqueness
```

Например:

```regex
^[a-zA-Z0-9_.-]{3,32}$
```

В БД лучше хранить:

```text
username_original
username_normalized = lower(username)
```

---

## 6.4. `POST /auth/login`

### Request

```json
{
  "username": "dmitry",
  "password": "correct horse battery staple"
}
```

### Success response

```json
{
  "user": {
    "id": "6f2a61a4-4bb9-4f2f-85fc-6019d0a5f7c1",
    "username": "dmitry"
  }
}
```

### Error response

```json
{
  "error": {
    "code": "invalid_credentials",
    "message": "Invalid username or password."
  }
}
```

Важно: не раскрывать, существует пользователь или нет.

---

## 6.5. `POST /auth/logout`

Требует валидную session cookie.

### Success response

```json
{
  "ok": true
}
```

Также удаляет cookie:

```http
Set-Cookie: souz_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0
```

---

## 6.6. `GET /auth/me`

Требует валидную session cookie.

### Success response

```json
{
  "user": {
    "id": "6f2a61a4-4bb9-4f2f-85fc-6019d0a5f7c1",
    "username": "dmitry"
  }
}
```

### Unauthorized

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Authentication required."
  }
}
```

---

# 7. Проксируемый backend API

Proxy должен проксировать следующие backend routes.

## Bootstrap

```http
GET /v1/bootstrap
```

Backend route есть в PR и возвращает bootstrap response через `bootstrapService.response(call.requestIdentity())`. ([GitHub][4])

---

## Settings

```http
GET   /v1/me/settings
PATCH /v1/me/settings
```

Backend settings DTO содержит:

```text
defaultModel
contextSize
temperature
locale
timeZone
systemPrompt
enabledTools
showToolEvents
streamingMessages
```

Эти поля proxy должен пропускать без изменения. ([GitHub][5])

---

## Provider keys

```http
GET    /v1/me/provider-keys
PUT    /v1/me/provider-keys/{provider}
DELETE /v1/me/provider-keys/{provider}
```

`PUT` принимает JSON с `apiKey`; backend сам trim’ит и проверяет, что `apiKey` не пустой. ([GitHub][6])

Proxy не должен логировать `apiKey`.

---

## Chats

```http
GET   /v1/chats
POST  /v1/chats
PATCH /v1/chats/{chatId}/title
POST  /v1/chats/{chatId}/archive
POST  /v1/chats/{chatId}/unarchive
```

Backend поддерживает list/create/update title/archive/unarchive и использует trusted user id из proxy. ([GitHub][3])

---

## Messages

```http
GET  /v1/chats/{chatId}/messages
POST /v1/chats/{chatId}/messages
```

`POST` принимает:

```json
{
  "content": "Привет",
  "clientMessageId": "optional-client-id",
  "options": {
    "model": "optional-model",
    "contextSize": 32000,
    "temperature": 0.2,
    "locale": "ru-RU",
    "timeZone": "Europe/Amsterdam",
    "systemPrompt": "optional"
  }
}
```

Backend проверяет, что `content` после trim не пустой, и возвращает `message`, optional `assistantMessage`, `execution`. ([GitHub][7])

---

## Events

```http
GET /v1/chats/{chatId}/events?afterSeq=0&limit=100
```

Backend events route поддерживает `afterSeq` и `limit`; возвращает `items`. ([GitHub][8])

---

## WebSocket

```http
WS /v1/chats/{chatId}/ws?afterSeq=0
```

Backend WebSocket route replay’ит durable events после `afterSeq`, затем отправляет live events; обычный `GET` без WebSocket upgrade на этот путь возвращает ошибку. ([GitHub][8])

---

## Cancel execution

```http
POST /v1/chats/{chatId}/cancel-active
POST /v1/chats/{chatId}/executions/{executionId}/cancel
```

Эти routes есть в backend route constants и chat routes. ([GitHub][2])

---

## Options

```http
POST /v1/options/{optionId}/answer
```

Request:

```json
{
  "selectedOptionIds": ["option-a"],
  "freeText": null,
  "metadata": {}
}
```

Backend route вызывает option service с `selectedOptionIds`, `freeText`, `metadata` и trusted user id. ([GitHub][9])

---

# 8. Trusted proxy contract

## 8.1. Headers from proxy to backend

Каждый `/v1/**` request от proxy к backend должен содержать:

```http
X-User-Id: <proxy-user-id>
X-Souz-Proxy-Auth: <shared-secret>
```

Где:

```text
X-User-Id = users.id из proxy DB
X-Souz-Proxy-Auth = SOUZ_BACKEND_PROXY_TOKEN
```

Backend проверяет `X-Souz-Proxy-Auth`, затем читает и валидирует `X-User-Id`; максимальная длина trusted user id — 256 символов, control characters запрещены. ([GitHub][1])

---

## 8.2. Headers, которые нельзя принимать от browser

Proxy обязан удалить входящие browser headers:

```http
X-User-Id
X-Souz-Proxy-Auth
X-Forwarded-User
X-Forwarded-Email
```

После удаления proxy выставляет свои значения:

```http
X-User-Id: <authenticated-user-id>
X-Souz-Proxy-Auth: <backend-proxy-token>
```

Browser никогда не должен иметь возможность управлять backend identity.

---

## 8.3. Cookies

Browser cookies не надо отправлять в backend.

То есть proxy должен удалить:

```http
Cookie
```

из upstream request к backend.

Backend не использует browser session cookie; backend доверяет только proxy headers.

---

# 9. Proxy DB schema

## 9.1. Extension

```sql
create extension if not exists pgcrypto;
```

---

## 9.2. `users`

```sql
create table users (
  id uuid primary key default gen_random_uuid(),

  username text not null,
  username_normalized text not null unique,

  password_hash text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz
);

create index users_disabled_idx
on users(disabled_at);
```

### Правила

```text
username_normalized = lower(trim(username))
disabled_at is not null -> user cannot login and cannot use existing sessions
```

`users.id::text` используется как `X-User-Id`.

---

## 9.3. `welcome_keys`

```sql
create table welcome_keys (
  id uuid primary key default gen_random_uuid(),

  key_hash text not null unique,

  created_at timestamptz not null default now(),
  expires_at timestamptz,

  used_at timestamptz,
  used_by_user_id uuid references users(id) on delete set null,

  comment text
);

create index welcome_keys_unused_idx
on welcome_keys(created_at)
where used_at is null;
```

### Правила

Welcome-key валиден, если:

```sql
used_at is null
and (expires_at is null or expires_at > now())
```

Ключи не храним в открытом виде.

---

## 9.4. `sessions`

```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id) on delete cascade,

  session_hash text not null unique,

  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,

  user_agent text,
  ip_hash text
);

create index sessions_user_id_idx
on sessions(user_id);

create index sessions_active_idx
on sessions(expires_at)
where revoked_at is null;
```

### Правила

Session валидна, если:

```sql
revoked_at is null
and expires_at > now()
and user.disabled_at is null
```

---

# 10. Hashing

## 10.1. Password hashing

Пароли хранить только как hash.

Рекомендация:

```text
Argon2id
```

Допустимо для MVP:

```text
bcrypt
```

В БД хранится полный encoded hash, например:

```text
$argon2id$v=19$m=65536,t=3,p=1$...
```

---

## 10.2. Session hashing

Session token:

```text
random 32+ bytes
base64url encoded
```

В cookie хранится raw token.

В DB хранится:

```text
session_hash = HMAC-SHA256(SESSION_HASH_SECRET, raw_session_token)
```

---

## 10.3. Welcome-key hashing

Welcome-key:

```text
random 24+ bytes
base64url encoded
```

В DB хранится:

```text
key_hash = HMAC-SHA256(WELCOME_KEY_SECRET, raw_welcome_key)
```

Админ создаёт raw welcome-key, отдаёт его пользователю, а в DB кладёт только hash.

Для MVP можно сделать отдельный helper script:

```bash
souz-proxy hash-welcome-key "raw-key"
```

Если helper script пока не нужен, можно временно считать hash вручную тем же алгоритмом, который использует proxy.

---

# 11. Signup transaction

`POST /auth/signup` должен быть атомарным.

Псевдокод:

```sql
begin;

select *
from welcome_keys
where key_hash = :key_hash
for update;

-- если не найдено -> rollback, invalid_welcome_key
-- если used_at is not null -> rollback, invalid_welcome_key
-- если expires_at <= now() -> rollback, invalid_welcome_key

insert into users (
  username,
  username_normalized,
  password_hash
) values (
  :username,
  :username_normalized,
  :password_hash
)
returning id;

update welcome_keys
set used_at = now(),
    used_by_user_id = :user_id
where id = :welcome_key_id;

insert into sessions (
  user_id,
  session_hash,
  expires_at,
  user_agent,
  ip_hash
) values (
  :user_id,
  :session_hash,
  now() + interval '30 days',
  :user_agent,
  :ip_hash
);

commit;
```

`SELECT ... FOR UPDATE` обязателен, чтобы один welcome-key нельзя было использовать дважды параллельными запросами.

---

# 12. Session cookie

Cookie name:

```text
souz_session
```

Cookie attributes:

```http
HttpOnly
Secure
SameSite=Lax
Path=/
Max-Age=2592000
```

Для local dev можно разрешить `Secure=false`, но только если `ENV=development`.

Production:

```http
Set-Cookie: souz_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
```

---

# 13. CSRF

Так как auth через cookie, state-changing requests желательно защитить от CSRF.

Для MVP можно выбрать один из двух вариантов.

## Вариант A — SameSite=Lax only

Проще.

Подходит, если:

```text
frontend и proxy на одном origin
нет cross-site POST use case
CORS выключен
```

## Вариант B — CSRF token

Надёжнее.

Proxy выдаёт CSRF token через:

```http
GET /auth/me
```

Response:

```json
{
  "user": {
    "id": "uuid",
    "username": "dmitry"
  },
  "csrfToken": "..."
}
```

Frontend отправляет его для unsafe methods:

```http
X-CSRF-Token: ...
```

Для MVP можно начать с варианта A, но обязательно выключить CORS.

---

# 14. Reverse proxy behavior

## 14.1. REST `/v1/**`

Для каждого request:

```text
1. Проверить session cookie.
2. Если session invalid -> 401.
3. Проверить user.disabled_at is null.
4. Удалить browser-provided identity headers.
5. Удалить Cookie перед upstream.
6. Добавить:
   - X-User-Id
   - X-Souz-Proxy-Auth
7. Передать method, path, query, body.
8. Вернуть browser status code, headers и body от backend.
```

Proxy не должен менять JSON DTO backend API.

---

## 14.2. WebSocket `/v1/chats/{chatId}/ws`

Browser:

```text
wss://app.example.com/v1/chats/{chatId}/ws?afterSeq=123
```

Proxy upstream:

```text
ws://souz-backend:8080/v1/chats/{chatId}/ws?afterSeq=123
```

Алгоритм:

```text
1. Проверить session cookie до upgrade.
2. Если session invalid -> reject upgrade.
3. Открыть upstream WebSocket к backend.
4. Добавить trusted headers:
   - X-User-Id
   - X-Souz-Proxy-Auth
5. Проксировать frames browser <-> backend.
6. При закрытии browser socket закрыть upstream socket.
7. При закрытии upstream socket закрыть browser socket.
```

Backend поддерживает replay через `afterSeq`, поэтому proxy должен сохранять query string как есть. ([GitHub][8])

---

# 15. Error format

## 15.1. Proxy errors

Все proxy-generated ошибки возвращать в формате:

```json
{
  "error": {
    "code": "error_code",
    "message": "Human readable message."
  }
}
```

Примеры:

### Unauthorized

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Authentication required."
  }
}
```

### Invalid welcome key

```json
{
  "error": {
    "code": "invalid_welcome_key",
    "message": "Welcome key is invalid, expired or already used."
  }
}
```

### Invalid credentials

```json
{
  "error": {
    "code": "invalid_credentials",
    "message": "Invalid username or password."
  }
}
```

### Backend unavailable

```json
{
  "error": {
    "code": "backend_unavailable",
    "message": "Backend is temporarily unavailable."
  }
}
```

---

## 15.2. Backend errors

Ошибки backend proxy должен пропускать без изменения.

Backend уже формирует `/v1` error envelope через `BackendV1ErrorEnvelope`. ([GitHub][10])

---

# 16. Environment variables

## Proxy

```env
PROXY_HOST=0.0.0.0
PROXY_PORT=8080

PUBLIC_BASE_URL=https://app.example.com

PROXY_DATABASE_URL=postgres://souz_proxy:password@proxy-db:5432/souz_proxy

BACKEND_URL=http://souz-backend:8080
SOUZ_BACKEND_PROXY_TOKEN=change-me

SESSION_HASH_SECRET=change-me
WELCOME_KEY_SECRET=change-me

COOKIE_NAME=souz_session
COOKIE_SECURE=true
SESSION_TTL_DAYS=30

ENV=production
```

## Backend

Backend default host в PR — `127.0.0.1`, поэтому в docker container нужно явно поставить `SOUZ_BACKEND_HOST=0.0.0.0`; proxy token также должен быть настроен, иначе `/v1` routes будут отвергать запросы. ([GitHub][11])

```env
SOUZ_BACKEND_HOST=0.0.0.0
SOUZ_BACKEND_PORT=8080
SOUZ_BACKEND_PROXY_TOKEN=change-me

SOUZ_STORAGE_MODE=postgres
SOUZ_BACKEND_DB_HOST=backend-db
SOUZ_BACKEND_DB_PORT=5432
SOUZ_BACKEND_DB_NAME=souz
SOUZ_BACKEND_DB_USER=souz
SOUZ_BACKEND_DB_PASSWORD=change-me
```

---

# 17. Docker Compose MVP

```yaml
services:
  web-proxy:
    image: souz-web-proxy:latest
    restart: unless-stopped
    ports:
      - "443:8080"
    environment:
      PROXY_HOST: "0.0.0.0"
      PROXY_PORT: "8080"
      PUBLIC_BASE_URL: "https://app.example.com"

      BACKEND_URL: "http://souz-backend:8080"
      SOUZ_BACKEND_PROXY_TOKEN: "${SOUZ_BACKEND_PROXY_TOKEN}"

      PROXY_DATABASE_URL: "postgres://souz_proxy:${PROXY_DB_PASSWORD}@proxy-db:5432/souz_proxy"

      SESSION_HASH_SECRET: "${SESSION_HASH_SECRET}"
      WELCOME_KEY_SECRET: "${WELCOME_KEY_SECRET}"

      COOKIE_NAME: "souz_session"
      COOKIE_SECURE: "true"
      SESSION_TTL_DAYS: "30"
      ENV: "production"
    depends_on:
      - proxy-db
      - souz-backend
    networks:
      - public
      - private

  proxy-db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: "souz_proxy"
      POSTGRES_USER: "souz_proxy"
      POSTGRES_PASSWORD: "${PROXY_DB_PASSWORD}"
    volumes:
      - proxy-db-data:/var/lib/postgresql/data
    expose:
      - "5432"
    networks:
      - private

  souz-backend:
    image: souz-backend:latest
    restart: unless-stopped
    environment:
      SOUZ_BACKEND_HOST: "0.0.0.0"
      SOUZ_BACKEND_PORT: "8080"
      SOUZ_BACKEND_PROXY_TOKEN: "${SOUZ_BACKEND_PROXY_TOKEN}"

      SOUZ_STORAGE_MODE: "postgres"
      SOUZ_BACKEND_DB_HOST: "backend-db"
      SOUZ_BACKEND_DB_PORT: "5432"
      SOUZ_BACKEND_DB_NAME: "souz"
      SOUZ_BACKEND_DB_USER: "souz"
      SOUZ_BACKEND_DB_PASSWORD: "${BACKEND_DB_PASSWORD}"
    expose:
      - "8080"
    depends_on:
      - backend-db
    networks:
      - private

  backend-db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: "souz"
      POSTGRES_USER: "souz"
      POSTGRES_PASSWORD: "${BACKEND_DB_PASSWORD}"
    volumes:
      - backend-db-data:/var/lib/postgresql/data
    expose:
      - "5432"
    networks:
      - private

volumes:
  proxy-db-data:
  backend-db-data:

networks:
  public:
  private:
    internal: true
```

Ключевой момент:

```yaml
souz-backend:
  expose:
    - "8080"
```

И не должно быть:

```yaml
souz-backend:
  ports:
    - "8080:8080"
```

---

# 18. Backend isolation

Backend защищается двумя слоями.

## 18.1. Network isolation

Backend доступен только внутри Docker private network.

```text
Internet -> web-proxy:443 доступен
Internet -> souz-backend:8080 недоступен
web-proxy -> souz-backend:8080 доступен
```

## 18.2. Application-level trusted proxy token

Даже если кто-то попадёт в private network, backend всё равно требует:

```http
X-Souz-Proxy-Auth: <secret>
X-User-Id: <user-id>
```

Backend проверяет token на каждом `/v1/**` request. ([GitHub][1])

---

# 19. Logging

Audit log в БД не делаем.

Обычные application logs разрешены, но нельзя логировать:

```text
password
confirmPassword
welcomeKey
session token
Cookie
Set-Cookie
X-Souz-Proxy-Auth
apiKey
provider keys
```

Можно логировать:

```text
method
path
status
duration_ms
user_id
request_id
```

Но без отдельной audit table.

---

# 20. Static frontend serving

Proxy container должен содержать собранный frontend.

Поведение:

```text
GET /assets/*        -> отдать файл
GET /favicon.ico     -> отдать файл
GET /                -> index.html
GET /login           -> index.html
GET /signup          -> index.html
GET /chats/...       -> index.html
```

Для SPA fallback:

```text
если path не /auth/** и не /v1/** и не /healthz и файл не найден,
вернуть index.html
```

---

# 21. Security requirements

Обязательные требования:

```text
backend container has no published ports
backend is only in private docker network
proxy is the only public service
SOUZ_BACKEND_PROXY_TOKEN is strong random secret
browser cannot set X-User-Id
browser cannot set X-Souz-Proxy-Auth
session cookie is HttpOnly
session cookie is Secure in production
passwords are hashed
welcome keys are hashed
sessions are stored as hashes
provider API keys are never logged by proxy
CORS disabled for production
```

---

# 22. Acceptance criteria

MVP proxy считается готовым, если выполняется всё ниже.

## Signup

```text
1. Пользователь может открыть /signup.
2. Невалидный welcome-key возвращает invalid_welcome_key.
3. Валидный welcome-key открывает форму username/password.
4. Signup создаёт user.
5. Signup помечает welcome-key как used.
6. Один welcome-key нельзя использовать дважды.
7. После signup пользователь получает session cookie.
```

## Login/logout

```text
1. Пользователь может войти по username/password.
2. Неверный пароль возвращает invalid_credentials.
3. Logout отзывает session.
4. После logout /auth/me возвращает unauthorized.
```

## Proxy to backend

```text
1. Без session cookie /v1/bootstrap возвращает 401.
2. С session cookie /v1/bootstrap успешно проксируется в backend.
3. Browser-provided X-User-Id игнорируется.
4. Browser-provided X-Souz-Proxy-Auth игнорируется.
5. Backend получает X-User-Id = users.id из proxy DB.
6. Backend получает X-Souz-Proxy-Auth = SOUZ_BACKEND_PROXY_TOKEN.
```

## Backend API

```text
1. GET /v1/me/settings работает.
2. PATCH /v1/me/settings работает.
3. GET /v1/me/provider-keys работает.
4. PUT /v1/me/provider-keys/{provider} работает.
5. GET /v1/chats работает.
6. POST /v1/chats работает.
7. GET /v1/chats/{chatId}/messages работает.
8. POST /v1/chats/{chatId}/messages работает.
9. GET /v1/chats/{chatId}/events работает.
10. WS /v1/chats/{chatId}/ws работает.
11. POST /v1/chats/{chatId}/cancel-active работает.
12. POST /v1/chats/{chatId}/executions/{executionId}/cancel работает.
13. POST /v1/options/{optionId}/answer работает.
```

## Network

```text
1. web-proxy доступен из интернета.
2. souz-backend недоступен из интернета.
3. backend-db недоступна из интернета.
4. proxy-db недоступна из интернета.
5. web-proxy может обратиться к souz-backend по http://souz-backend:8080.
```

---

# 23. Главный invariant

Это стоит прямо вынести в README proxy:

```text
Backend never trusts the browser.
Backend trusts only the proxy.

Browser identity is represented only by proxy session.
Backend identity is represented only by X-User-Id set by proxy.

Any browser-provided X-User-Id or X-Souz-Proxy-Auth must be ignored and replaced.
```

---

# 24. Рекомендуемый порядок реализации

```text
1. Создать proxy DB migrations:
   - users
   - welcome_keys
   - sessions

2. Реализовать hashing:
   - password hash
   - session hash
   - welcome-key hash

3. Реализовать auth API:
   - /auth/welcome/verify
   - /auth/signup
   - /auth/login
   - /auth/logout
   - /auth/me

4. Реализовать static frontend serving.

5. Реализовать REST reverse proxy для /v1/**.

6. Реализовать WebSocket reverse proxy для /v1/chats/{chatId}/ws.

7. Добавить Docker Compose.

8. Проверить, что backend не имеет published ports.

9. Прогнать acceptance criteria.

Да, в спецификацию можно добавить отдельный раздел **“Технологический стек”** и несколько уточнений по реализации.

---

# Дополнение к спецификации: технологический стек

## 25. Технологический стек

Proxy должен быть реализован на **Kotlin** и использовать привычный для проекта backend stack.

Основной стек:

```text id="jte7ca"
Language: Kotlin
Runtime: JVM
HTTP framework: Ktor
Serialization: kotlinx.serialization
Database: PostgreSQL
DB access: Exposed / JDBC / привычный для проекта DB layer
Migrations: Flyway или другой уже используемый migration tool
Password hashing: Argon2id или bcrypt
Build tool: Gradle
Containerization: Docker
Deployment: Docker Compose
```

Если в основном backend уже используются конкретные библиотеки, proxy должен по возможности следовать тем же подходам:

```text id="7qo5l6"
единый стиль конфигурации через environment variables
единый формат JSON DTO
единый формат error envelope
единый стиль роутинга
единый стиль логирования
единый подход к healthcheck
единый подход к Dockerfile
```

---

## 25.1. Kotlin/Ktor requirement

Proxy service должен быть отдельным Kotlin-приложением.

Рекомендуемая структура модулей:

```text id="zmdm74"
proxy/
  build.gradle.kts
  Dockerfile
  src/main/kotlin/...
  src/main/resources/...
  src/main/resources/db/migration/...
```

Примерная структура пакетов:

```text id="dl3rzj"
ru.souz.proxy
  app/
    ProxyMain.kt
    ProxyConfig.kt

  auth/
    AuthRoutes.kt
    AuthService.kt
    PasswordHasher.kt
    SessionService.kt
    WelcomeKeyService.kt

  db/
    DatabaseFactory.kt
    UsersTable.kt
    SessionsTable.kt
    WelcomeKeysTable.kt

  proxy/
    BackendReverseProxy.kt
    BackendWebSocketProxy.kt
    HeaderSanitizer.kt

  http/
    ErrorEnvelope.kt
    HealthRoutes.kt
    StaticRoutes.kt
```

---

## 25.2. Ktor server requirements

Proxy должен использовать Ktor server features/plugins:

```text id="d6xygm"
ContentNegotiation + kotlinx.serialization
CallLogging
StatusPages
WebSockets
ForwardedHeaders / XForwardedHeaders, если proxy стоит за внешним reverse proxy
Compression, если нужно для static frontend
```

Для `/v1/**` proxy должен поддерживать:

```text id="97tkuo"
GET
POST
PUT
PATCH
DELETE
query params
JSON request body
JSON response body
streaming where needed
WebSocket upgrade
```

---

## 25.3. HTTP client to backend

Для запросов из proxy в backend использовать Ktor HTTP Client.

```text id="nxpvl7"
Ktor Client CIO или OkHttp engine
```

Требования:

```text id="o44n4r"
передавать method/path/query/body
не передавать browser Cookie
удалять browser-provided identity headers
добавлять X-User-Id
добавлять X-Souz-Proxy-Auth
проксировать backend status code
проксировать backend response body
```

Для WebSocket использовать Ktor WebSockets client или другой привычный JVM/Kotlin-compatible client.

---

## 25.4. Serialization

Использовать `kotlinx.serialization`.

Все proxy DTO должны быть serializable data classes:

```kotlin id="zgxzgf"
@Serializable
data class LoginRequest(
    val username: String,
    val password: String
)

@Serializable
data class AuthUserDto(
    val id: String,
    val username: String
)

@Serializable
data class AuthResponse(
    val user: AuthUserDto
)

@Serializable
data class ErrorEnvelope(
    val error: ErrorDto
)

@Serializable
data class ErrorDto(
    val code: String,
    val message: String
)
```

---

## 25.5. Database

Proxy DB — PostgreSQL.

MVP tables:

```text id="ulbnc7"
users
welcome_keys
sessions
```

Audit log не реализуем.

Proxy не должен использовать backend DB напрямую.

```text id="1dgf87"
proxy -> proxy-db
backend -> backend-db
proxy -X-> backend-db
backend -X-> proxy-db
```

---

## 25.6. Migrations

DB schema должна создаваться через migrations.

Например:

```text id="qgqfdr"
src/main/resources/db/migration/V001__init_proxy_schema.sql
```

Migration должна создать:

```text id="2syuxl"
pgcrypto extension
users table
welcome_keys table
sessions table
indexes
```

---

## 25.7. Configuration style

Конфигурация только через environment variables.

Proxy config должен быть типизированным Kotlin object/data class:

```kotlin id="2a25va"
data class ProxyConfig(
    val host: String,
    val port: Int,
    val publicBaseUrl: String,
    val databaseUrl: String,
    val backendUrl: String,
    val backendProxyToken: String,
    val sessionHashSecret: String,
    val welcomeKeySecret: String,
    val cookieName: String,
    val cookieSecure: Boolean,
    val sessionTtlDays: Long,
    val env: String
)
```

Обязательные env variables:

```env id="wew90o"
PROXY_HOST=0.0.0.0
PROXY_PORT=8080

PUBLIC_BASE_URL=https://app.example.com

PROXY_DATABASE_URL=postgres://souz_proxy:password@proxy-db:5432/souz_proxy

BACKEND_URL=http://souz-backend:8080
SOUZ_BACKEND_PROXY_TOKEN=change-me

SESSION_HASH_SECRET=change-me
WELCOME_KEY_SECRET=change-me

COOKIE_NAME=souz_session
COOKIE_SECURE=true
SESSION_TTL_DAYS=30

ENV=production
```

---

## 25.8. Error style

Proxy errors должны быть в том же стиле, что backend `/v1` errors:

```json id="pbut7f"
{
  "error": {
    "code": "unauthorized",
    "message": "Authentication required."
  }
}
```

Для proxy-generated errors использовать коды:

```text id="n1lnsl"
unauthorized
invalid_credentials
invalid_welcome_key
validation_error
username_taken
backend_unavailable
backend_timeout
bad_gateway
```

Backend errors proxy должен пропускать без изменения.

---

## 25.9. Dockerfile

Proxy должен собираться как JVM container.

Примерно:

```dockerfile id="z8sst0"
FROM gradle:8-jdk21 AS build
WORKDIR /app
COPY . .
RUN gradle :proxy:installDist --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/proxy/build/install/proxy ./
COPY --from=build /app/frontend/dist ./public
EXPOSE 8080
CMD ["./bin/proxy"]
```

Если проект уже использует другой Java version или другой Docker base image, использовать его для консистентности.

---

## 25.10. Требование к стилю реализации

Proxy должен быть написан в стиле, близком к существующему backend:

```text id="acojh4"
Kotlin data classes
explicit config через env
маленькие service-классы
роуты отдельно от бизнес-логики
отдельный слой DB/repository
единый JSON error envelope
никакой бизнес-логики backend agent внутри proxy
```

Proxy — это auth/session/reverse-proxy слой, а не второй backend.

---

## Короткая формулировка для вставки в начало ТЗ

Можно добавить в раздел “Общие требования”:

```text id="lhw8qk"
Proxy должен быть реализован на Kotlin/JVM с использованием привычного для проекта стека: Ktor, kotlinx.serialization, PostgreSQL, Gradle, Docker/Docker Compose и того же стиля конфигурации через environment variables, что и основной backend. Реализация должна быть консистентна с существующим backend-кодом проекта по структуре, error envelope, logging style и подходу к healthcheck.
```
