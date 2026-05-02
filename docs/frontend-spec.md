Твоя задача — реализовать production-ready web app внутри проекта proxy.

ВАЖНО:
- Не работай с репозиторием souz-web.
- Landing будет доработан отдельно: там просто добавят кнопку Try Web Version -> /app/login.
- В этом репозитории нужно реализовать frontend web app, который будет собираться вместе с proxy и отдаваться proxy как static SPA.
- Web app должна жить под path prefix: /app/**
- Auth API остаётся на /auth/**
- Backend API через proxy остаётся на /v1/**
- WebSocket остаётся на /v1/chats/{chatId}/ws
- Backend напрямую из браузера недоступен.
- Browser работает только same-origin.
```

# 1. Целевая архитектура

```text
Browser
  -> https://souz.app/app/**
       frontend web app, served by souz-proxy

  -> https://souz.app/auth/**
       proxy auth API

  -> https://souz.app/v1/**
       proxy -> backend

  -> wss://souz.app/v1/chats/{chatId}/ws?afterSeq=...
       proxy -> backend websocket


Nginx
  /app/**  -> proxy container
  /auth/** -> proxy container
  /v1/**   -> proxy container


Proxy container
  - serves frontend SPA under /app/**
  - handles /auth/**
  - reverse-proxies /v1/**
  - reverse-proxies websocket /v1/chats/{chatId}/ws
  - adds trusted backend headers


Backend container
  - private docker network only
  - no public port
```

# 2. Hard requirements

```text
MUST:
- Add frontend source code inside this repository.
- Recommended path: frontend/
- Build frontend as part of proxy Docker image.
- Serve built frontend from proxy static public directory.
- Support /app/login, /app/signup, /app/chats, /app/chats/:chatId, /app/settings.
- Use real /auth/** API.
- Use real /v1/** backend API through proxy.
- Use HttpOnly cookie session through credentials: include.
- Use WebSocket same-origin URL.
- Implement chat, messages, streaming, tool calls, options, settings, provider keys.
- Keep backend inaccessible from browser.
- Keep frontend API URLs relative.

MUST NOT:
- Do not add VITE_BACKEND_URL for browser code.
- Do not call backend directly from browser.
- Do not send X-User-Id from frontend.
- Do not send X-Souz-Proxy-Auth from frontend.
- Do not send X-Forwarded-User / X-Forwarded-Email from frontend.
- Do not store session token in localStorage/sessionStorage.
- Do not store password, welcomeKey, provider apiKey in localStorage/sessionStorage.
- Do not implement mock login as production logic.
- Do not implement simulated AI responses as production logic.
- Do not hardcode production provider keys.
- Do not use choice.requested / choice.answered as event names.
- Use option.requested / option.answered.
```

# 3. Repository changes

Add frontend app:

```text
souz-proxy/
  frontend/
    package.json
    index.html
    vite.config.ts
    tsconfig.json
    tailwind.config.js
    postcss.config.js
    src/
      main.tsx
      app/
      pages/
      layouts/
      api/
      auth/
      chat/
      components/
      types/
```

Existing Kotlin proxy code should continue to work.

Update Dockerfile so final image contains:

```text
/app/public/index.html
/app/public/assets/...
```

The proxy should serve this frontend under:

```text
/app/**
```

# 4. Frontend build requirements

Frontend must be Vite + React + TypeScript.

Vite config:

```ts
base: "/app/"
```

Reason: app is served from `/app/**`, so generated assets must load from:

```text
/app/assets/...
```

not:

```text
/assets/...
```

Recommended scripts in `frontend/package.json`:

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

# 5. Docker requirements

Update proxy Dockerfile to build frontend.

Recommended multi-stage structure:

```dockerfile
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM gradle:8-jdk21 AS proxy-build
WORKDIR /app
COPY . .
RUN gradle installDist --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=proxy-build /app/build/install/souz-proxy ./
COPY --from=frontend-build /frontend/dist ./public
EXPOSE 8080
CMD ["./bin/souz-proxy"]
```

Adapt to existing Dockerfile if needed, but final image must include built frontend in the static directory used by proxy.

# 6. Static routing requirements in proxy

Proxy must handle:

```text
/app
  -> redirect to /app/

/app/
  -> frontend index.html

/app/login
/app/signup
/app/chats
/app/chats/:chatId
/app/settings
  -> frontend index.html

/app/assets/*
  -> static frontend assets
```

Proxy must NOT let SPA fallback catch:

```text
/auth/**
/v1/**
/healthz
```

If current static routing only serves `/`, update it to support `/app/**`.

Expected behavior:

```text
GET /app/login
  returns frontend index.html

GET /app/assets/index-xxx.js
  returns static asset

GET /auth/me
  handled by auth route

GET /v1/bootstrap
  proxied to backend

GET /healthz
  handled by proxy health route
```

# 7. Nginx assumptions

Document this in repository docs, but do not depend on subdomain.

Production Nginx is expected to route:

```nginx
location = /app {
    return 301 /app/;
}

location ^~ /app/ {
    proxy_pass http://127.0.0.1:8080;
}

location ^~ /auth/ {
    proxy_pass http://127.0.0.1:8080;
}

location ^~ /v1/ {
    proxy_pass http://127.0.0.1:8080;

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

Proxy container should be bound only locally:

```yaml
ports:
  - "127.0.0.1:8080:8080"
```

# 8. Frontend routes

Use React Router.

Preferred:

```tsx
<BrowserRouter basename="/app">
  ...
</BrowserRouter>
```

Internal routes:

```text
/login
/signup
/chats
/chats/:chatId
/settings
```

Browser URLs:

```text
/app/login
/app/signup
/app/chats
/app/chats/:chatId
/app/settings
```

Redirects:

```text
/app       -> /app/chats if authenticated, else /app/login
/app/      -> /app/chats if authenticated, else /app/login
/app/login -> /app/chats if already authenticated
```

Protected routes:

```text
/app/chats
/app/chats/:chatId
/app/settings
```

Unauthenticated access to protected routes redirects to:

```text
/app/login
```

# 9. Visual style

Use this visual direction:

```text
- dark premium UI
- glassmorphism cards
- subtle gradients
- rounded panels
- polished login/signup
- sidebar chat layout
- compact tool activity cards
- settings page with grouped cards
- calm animations, not distracting
```

Do not implement a raw unstyled admin UI.

Do not spend too much time on perfect visual polish before production logic works.

# 10. Auth implementation

Use existing proxy auth endpoints.

Required API calls:

```http
GET /auth/me

POST /auth/login
Content-Type: application/json

{
  "username": "...",
  "password": "..."
}

POST /auth/welcome/verify
Content-Type: application/json

{
  "welcomeKey": "..."
}

POST /auth/signup
Content-Type: application/json

{
  "welcomeKey": "...",
  "username": "...",
  "password": "...",
  "confirmPassword": "..."
}

POST /auth/logout
```

All auth requests:

```ts
credentials: "include"
```

Frontend must not read session cookie directly.

Auth flow:

```text
App boot:
  GET /auth/me
  200 -> authenticated
  401 -> unauthenticated

Login:
  POST /auth/login
  then GET /v1/bootstrap
  then redirect /app/chats

Signup:
  POST /auth/welcome/verify
  then POST /auth/signup
  then GET /v1/bootstrap
  then redirect /app/chats

Logout:
  POST /auth/logout
  clear frontend state
  redirect /app/login
```

Login page:

```text
Fields:
- username
- password

Actions:
- Log in
- link to signup: “I have a welcome key”
```

Login states:

```text
- idle
- loading
- invalid credentials
- backend/proxy unavailable
- session expired
```

Signup page must be two-step.

Step 1:

```text
Field:
- welcome key

Action:
- Continue
```

Step 2:

```text
Fields:
- username
- password
- confirm password

Action:
- Create account
```

Signup states:

```text
- invalid welcome key
- validation error
- username already taken
- loading
- success redirect
```

Security:

```text
- do not store welcomeKey
- do not store password
- do not log auth payloads
```

# 11. API client

Create:

```text
frontend/src/api/http.ts
frontend/src/api/auth.ts
frontend/src/api/bootstrap.ts
frontend/src/api/chats.ts
frontend/src/api/messages.ts
frontend/src/api/events.ts
frontend/src/api/settings.ts
frontend/src/api/providerKeys.ts
frontend/src/api/options.ts
frontend/src/api/executions.ts
```

`http.ts` requirements:

```text
- use relative URLs
- always use credentials: include
- parse JSON responses
- parse error envelope:
  { error: { code: string, message: string } }
- throw typed ApiError
- handle 401 consistently
- never attach proxy-trust headers
```

Suggested type:

```ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}
```

# 12. Bootstrap

Implement:

```http
GET /v1/bootstrap
```

Use bootstrap after auth and on protected app load.

Store:

```text
- user
- features
- storageMode
- capabilities.models
- capabilities.tools
- settings
```

Do not hardcode models/tools if backend returns them.

# 13. Settings

Implement:

```http
GET /v1/me/settings
PATCH /v1/me/settings
```

Settings type:

```ts
type Settings = {
  defaultModel: string;
  contextSize: number;
  temperature: number;
  locale: string;
  timeZone: string;
  systemPrompt: string | null;
  enabledTools: string[];
  showToolEvents: boolean;
  streamingMessages: boolean;
};
```

Settings page sections:

```text
Profile
Model
Tools
Provider Keys
Interface
```

Model settings UI:

```text
- defaultModel select from bootstrap capabilities.models
- contextSize input/slider
- temperature input/slider
- systemPrompt textarea
- locale
- timeZone
- Save
- Reset changes
```

Tools UI:

```text
- enabledTools checkbox/multi-select from bootstrap capabilities.tools
- showToolEvents switch
- streamingMessages switch
```

Settings page must be reachable from app sidebar.

# 14. Provider keys

Implement:

```http
GET /v1/me/provider-keys
PUT /v1/me/provider-keys/{provider}
DELETE /v1/me/provider-keys/{provider}
```

PUT body:

```json
{
  "apiKey": "..."
}
```

Provider keys UI:

```text
For each provider:
- provider name
- configured / not configured
- keyHint
- updatedAt
- Add / Replace key
- Delete key
```

Security requirements:

```text
- never show full API key
- never store API key in localStorage/sessionStorage
- clear input after successful save
- no “copy key” button
- no logging provider key
- show notice: keys are stored securely/encrypted on backend
```

# 15. Chats

Implement:

```http
GET /v1/chats
POST /v1/chats
PATCH /v1/chats/{chatId}/title
POST /v1/chats/{chatId}/archive
POST /v1/chats/{chatId}/unarchive
```

Chat sidebar requirements:

```text
- New chat button
- chat list
- active chat state
- recent/archived filter or archived section
- rename chat
- archive chat
- unarchive chat
- updatedAt
- lastMessagePreview
```

States:

```text
- loading skeleton
- empty chats
- empty archived chats
- failed to load
```

# 16. Messages

Implement:

```http
GET /v1/chats/{chatId}/messages
POST /v1/chats/{chatId}/messages
```

Create message request:

```ts
type CreateMessageRequest = {
  content: string;
  clientMessageId?: string;
  options?: {
    model?: string;
    contextSize?: number;
    temperature?: number;
    locale?: string;
    timeZone?: string;
    systemPrompt?: string;
  };
};
```

Composer requirements:

```text
- multiline textarea
- Send button
- Stop button during active execution
- Enter sends
- Shift+Enter inserts newline
- Cmd/Ctrl+Enter may also send
- empty prompt cannot be sent
- duplicate send blocked while active execution is running in current chat
- generate clientMessageId on frontend
```

Message types:

```text
- user message
- assistant message
- streaming assistant message
- error/system message
- cancelled message state
```

Assistant bubble:

```text
- markdown support
- code block support
- copy button
- tool activity block
- option cards inline
```

# 17. Execution cancel

Implement:

```http
POST /v1/chats/{chatId}/cancel-active
POST /v1/chats/{chatId}/executions/{executionId}/cancel
```

UI behavior:

```text
- show Stop button when execution status is active
- active statuses:
  queued
  running
  waiting_option
  cancelling
- after cancel request show cancelling state
- when execution.cancelled event arrives, clear active execution
```

# 18. WebSocket

WebSocket URL must be same-origin:

```ts
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}/v1/chats/${chatId}/ws?afterSeq=${lastSeq ?? 0}`;
```

Do not use backend URL.

WebSocket behavior:

```text
- connect when active chat is opened
- pass afterSeq
- update last durable seq from incoming durable events
- reconnect on disconnect with backoff
- show connection lost/reconnecting UI
- do not duplicate events after reconnect
```

# 19. Events replay

Implement:

```http
GET /v1/chats/{chatId}/events?afterSeq=0&limit=100
```

Use when:

```text
- active chat opens
- page refreshes
- websocket reconnects
- lastSeq is known and durable replay is needed
```

Event DTO:

```ts
type BackendEvent = {
  seq: number | null;
  durable: boolean;
  chatId: string;
  executionId: string | null;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};
```

Supported event types:

```text
message.created
message.delta
message.completed
tool.call.started
tool.call.finished
tool.call.failed
option.requested
option.answered
execution.started
execution.finished
execution.failed
execution.cancelled
```

Important:

```text
Use option.requested and option.answered.
Do not use choice.requested and choice.answered as canonical event names.
```

Reducer behavior:

```text
message.created:
  add message if it does not exist

message.delta:
  append delta to streaming assistant buffer

message.completed:
  finalize assistant message and clear streaming buffer

tool.call.started:
  create/update running tool call card

tool.call.finished:
  mark tool call as finished and show resultPreview/durationMs

tool.call.failed:
  mark tool call as failed and show error

option.requested:
  show pending OptionCard

option.answered:
  mark OptionCard answered/closed

execution.started:
  set activeExecution

execution.finished:
  clear activeExecution and show usage if available

execution.failed:
  clear activeExecution and show error

execution.cancelled:
  clear activeExecution and show cancelled state
```

Reducer must be idempotent.

# 20. Tool calls UI

Tool calls must come only from backend events:

```text
tool.call.started
tool.call.finished
tool.call.failed
```

Do not create fake tool calls.

Tool activity display:

```text
Inside or below assistant message:
- collapsed “Tool activity” block
- expandable details
```

Optional right-side panel is allowed, but not required.

Tool call card fields:

```text
- tool name
- status: running / finished / failed
- argumentsPreview
- resultPreview
- error
- durationMs
- expand/collapse
```

Security:

```text
- do not show secrets
- do not show provider API keys
- do not show auth headers
- do not show raw sensitive payloads
```

# 21. Options UI

Implement interactive option flow.

Event names:

```text
option.requested
option.answered
```

API:

```http
POST /v1/options/{optionId}/answer
```

Request body:

```ts
type AnswerOptionRequest = {
  selectedOptionIds: string[];
  freeText?: string | null;
  metadata?: Record<string, string>;
};
```

Option card UI:

```text
- title
- description/content
- selection mode: single / multiple
- options list
- free text input if supported
- Submit button
- submitting state
- answered state
- failed to submit state
```

Suggested label:

```text
Souz needs your input
```

Option card should appear inline in chat flow.

# 22. App shell

Implement protected app shell.

Desktop:

```text
Left sidebar:
- Souz logo
- New chat
- chat list
- archived/recent filter
- Settings
- user/profile area
- Logout

Main:
- chat header
- message list
- composer
```

Mobile:

```text
- sidebar as drawer
- chat full-screen
- back to chats button
```

Settings must be easy to find from sidebar.

# 23. Empty/loading/error states

Implement shared UI states.

Loading:

```text
- page loader
- chat list skeleton
- message skeleton
- button spinner
```

Empty:

```text
- no chats
- no messages
- no archived chats
- no provider keys
```

Errors:

```text
- inline field error
- form-level error
- toast/global error
- backend unavailable
- proxy unavailable
- connection lost
- session expired
- provider key missing
- execution failed
```

Connection:

```text
- connection lost banner
- reconnecting indicator
- manual retry/reconnect
```

Unauthorized:

```text
- session expired -> redirect to /app/login
```

# 24. Suggested frontend structure

```text
frontend/src/
  main.tsx

  app/
    App.tsx
    routes.tsx

  pages/
    LoginPage.tsx
    SignupPage.tsx
    ChatPage.tsx
    SettingsPage.tsx

  layouts/
    AuthLayout.tsx
    AppShell.tsx

  api/
    http.ts
    auth.ts
    bootstrap.ts
    chats.ts
    messages.ts
    events.ts
    settings.ts
    providerKeys.ts
    options.ts
    executions.ts

  auth/
    AuthProvider.tsx
    RequireAuth.tsx
    useAuth.ts

  chat/
    eventReducer.ts
    useChatSocket.ts
    useChatMessages.ts
    useActiveChat.ts

  components/
    auth/
      LoginForm.tsx
      SignupForm.tsx

    app/
      Sidebar.tsx
      UserMenu.tsx

    chat/
      ChatSidebar.tsx
      ChatHeader.tsx
      MessageList.tsx
      MessageBubble.tsx
      Composer.tsx
      ToolActivity.tsx
      ToolCallCard.tsx
      OptionCard.tsx
      ExecutionStatus.tsx

    settings/
      SettingsNav.tsx
      ModelSettingsForm.tsx
      ToolSettingsForm.tsx
      ProviderKeysPanel.tsx

    ui/
      Button.tsx
      Input.tsx
      Card.tsx
      Modal.tsx
      Toast.tsx
      Spinner.tsx

  types/
    api.ts
    auth.ts
    chat.ts
    events.ts
    settings.ts
```

# 25. Documentation to add

Add docs inside proxy repo:

```text
docs/web-app.md
docs/deployment-path-routing.md
```

`docs/web-app.md` should explain:

```text
- frontend lives in frontend/
- frontend served under /app/**
- API paths are /auth/** and /v1/**
- no direct backend access from browser
- auth uses HttpOnly cookie
- provider keys are never stored in frontend
```

`docs/deployment-path-routing.md` should explain:

```text
- souz.app/ landing is served separately from /var/www/souz-web/
- souz.app/app/** goes to proxy container
- souz.app/auth/** goes to proxy container
- souz.app/v1/** goes to proxy container
- proxy container listens on 127.0.0.1:8080
- backend is private network only
- include example Nginx config
```

# 26. Acceptance criteria

## Build

```text
- proxy backend still builds
- frontend builds with npm run build inside frontend/
- Docker image builds frontend and proxy
- final image contains built frontend static files
```

## Static routing

```text
- GET /app redirects or opens app
- GET /app/login returns frontend index.html
- GET /app/signup returns frontend index.html
- GET /app/chats returns frontend index.html
- GET /app/chats/:chatId returns frontend index.html
- GET /app/settings returns frontend index.html
- GET /app/assets/* returns frontend assets
- GET /auth/me is not captured by SPA fallback
- GET /v1/bootstrap is not captured by SPA fallback
- GET /healthz is not captured by SPA fallback
```

## Auth

```text
- GET /auth/me restores session
- POST /auth/login logs in
- POST /auth/welcome/verify validates welcome key
- POST /auth/signup creates account
- POST /auth/logout logs out
- no localStorage auth
- no demo credentials
- no JS access to session cookie
```

## API security

```text
- frontend uses only relative URLs
- frontend API calls use credentials: include
- frontend never sends X-User-Id
- frontend never sends X-Souz-Proxy-Auth
- frontend never sends X-Forwarded-User
- frontend never uses backend URL
```

## App shell

```text
- protected app shell exists
- sidebar exists
- New chat button exists
- chat list exists
- Settings link exists
- Logout exists
- mobile layout is usable
```

## Chats

```text
- GET /v1/chats loads chat list
- POST /v1/chats creates chat
- PATCH /v1/chats/{chatId}/title renames chat
- POST /v1/chats/{chatId}/archive archives chat
- POST /v1/chats/{chatId}/unarchive unarchives chat
```

## Messages

```text
- GET /v1/chats/{chatId}/messages loads history
- POST /v1/chats/{chatId}/messages sends prompt
- clientMessageId is generated
- empty prompt cannot be sent
- duplicate send blocked during active execution
```

## Streaming/events

```text
- WebSocket connects to /v1/chats/{chatId}/ws?afterSeq=...
- GET /v1/chats/{chatId}/events supports replay
- message.delta streams text
- message.completed finalizes assistant response
- execution.started updates active execution
- execution.finished clears active execution
- execution.failed shows error
- execution.cancelled shows cancelled state
- reconnect does not duplicate messages
```

## Tool calls

```text
- tool.call.started shows running tool card
- tool.call.finished shows resultPreview/durationMs
- tool.call.failed shows error
- no mock tool calls
```

## Options

```text
- option.requested shows OptionCard
- option.answered closes or marks OptionCard answered
- POST /v1/options/{optionId}/answer submits answer
- single selection works
- multiple selection works
- freeText works if payload supports it
```

## Settings

```text
- GET /v1/bootstrap loads capabilities
- GET /v1/me/settings loads settings
- PATCH /v1/me/settings saves settings
- settings page reachable from sidebar
- model list comes from backend capabilities
- tool list comes from backend capabilities
```

## Provider keys

```text
- GET /v1/me/provider-keys loads keys
- PUT /v1/me/provider-keys/{provider} saves key
- DELETE /v1/me/provider-keys/{provider} deletes key
- full API key is never displayed
- full API key is never stored in browser
- input clears after save
```

# 27. Implementation order

Follow this order:

```text
1. Add frontend/ Vite React TypeScript app.
2. Add Docker build integration.
3. Update proxy static routing for /app/**.
4. Add auth API client and auth pages.
5. Add protected routing and app shell.
6. Add bootstrap loading.
7. Add settings page.
8. Add provider keys.
9. Add chats sidebar.
10. Add messages and composer.
11. Add execution cancel.
12. Add WebSocket client.
13. Add event reducer and replay.
14. Add tool activity UI.
15. Add option cards.
16. Add deployment docs.
17. Run build/test and fix issues.
```

# 28. Final success condition

The final result should allow this flow:

```text
1. User opens https://souz.app/app/login.
2. Proxy serves frontend app from its Docker image.
3. User logs in through /auth/login.
4. Frontend receives auth state through /auth/me and HttpOnly cookie.
5. Frontend loads /v1/bootstrap.
6. User opens /app/chats.
7. Frontend loads chats from /v1/chats.
8. User sends message through /v1/chats/{chatId}/messages.
9. Frontend receives live updates through WebSocket /v1/chats/{chatId}/ws.
10. Tool calls appear from tool.call.* events.
11. Options appear from option.requested events.
12. Settings and provider keys are managed through /v1/me/**.
13. Browser never talks to backend directly.
```

Final priority:

```text
Correct production architecture > perfect visual polish.
Real API integration > mock behavior.
Do not expose backend > convenience shortcuts.
Do not break proxy auth/API routes > SPA fallback.
```
