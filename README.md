# ChatApp OAuth Connect Service

Standalone OAuth callback service for ChatApp social identity badges. This service implements **only** `/chatapp/connect/:provider`; it does not provide general-purpose `/oauth` or `/public/connect` endpoints, and it does not persist provider tokens or profile data.

## Setup

1. Copy `.env.example` to `.env` and set provider credentials and registered callback URLs.
2. Install dependencies with `pnpm install` (Node >= 22.18).
3. Develop with `pnpm dev` (runs `src/index.ts` directly with watch mode).
4. Build with `pnpm build` and run the compiled output with `pnpm start`.
5. Health check: `GET /health`.

Quality checks: `pnpm typecheck`, `pnpm check` (Biome lint + format), `pnpm check:fix` to apply fixes.

## Project structure

```
src/
  index.ts                 server entry point
  app.ts                   Express app: middleware, routes, 404 and error handlers
  config/env.ts            environment helpers
  routes/                  index.ts mounts health.routes.ts and chatappConnect.routes.ts
  controllers/             request handlers (health, chatappConnect)
  middleware/              resolveProvider, notFound, errorHandler
  providers/index.ts       provider map, aliases, credentials, scopes, callback URLs
  providers/<name>.ts      one file per provider: endpoints, token exchange quirks, profile fetch
  services/oauthState.ts   signed OAuth state
  services/oauthClient.ts  authorize URL, token exchange, profile fetch dispatch
  types/                   shared types (OAuth, responses, Express locals)
  utils/                   response, query and URL helpers
```

Use HTTPS in production. Set a strong shared `SOCIAL_STATE_SECRET`. Register each callback URL exactly as configured in the provider developer console. OAuth state is signed and expires after 10 minutes. X uses PKCE.

## Endpoints

Each provider has:

- `GET /chatapp/connect/:provider` — starts OAuth and redirects to the provider.
- `GET /chatapp/connect/:provider?format=json` — returns an authorization URL rather than redirecting.
- `GET /chatapp/connect/:provider/callback` — exchanges the short-lived authorization code, fetches the profile summary, and returns a response.
- X also accepts `/chatapp/connect/twitter` as an alias for `/chatapp/connect/x`.

Supported provider values: `youtube`, `github`, `facebook`, `x`, and `linkedin`.

### Start OAuth

Browser flow:

```text
GET https://oauth.example.com/chatapp/connect/github
```

SPA flow:

```text
GET https://oauth.example.com/chatapp/connect/github?format=json
```

Example pending response:

```json
{
  "success": true,
  "status": "pending",
  "data": {
    "provider": "github",
    "authUrl": "https://github.com/login/oauth/authorize?..."
  }
}
```

Optional `redirect_to=https://yourapp.example/connected` is signed into OAuth state. After authorization, the callback redirects there with `success`, `status`, and URL-encoded JSON `data` query parameters. Use only a trusted HTTPS callback URL.

### Success response

The callback exposes a small provider summary only; it never returns access or refresh tokens.

```json
{
  "success": true,
  "succcess": true,
  "status": "success",
  "data": {
    "provider": "github",
    "username": "octocat",
    "name": "The Octocat",
    "followers": 123
  }
}
```

Metric by provider:

| Provider | `data` metric | Notes                                                                                            |
| -------- | ------------- | ------------------------------------------------------------------------------------------------ |
| YouTube  | `subscribers` | Channel count; `null` if hidden/unavailable.                                                     |
| GitHub   | `followers`   | Public followers.                                                                                |
| Facebook | `followers`   | `null` unless an available authorized metric is returned.                                        |
| X        | `followers`   | Requires `tweet.read users.read` for `/2/users/me`; excludes `tweet.write` and `offline.access`. |
| LinkedIn | `connections` | `null`; LinkedIn OIDC `userinfo` does not provide connection counts.                             |

A successful response has this common shape:

```json
{
  "success": true,
  "succcess": true,
  "status": "success",
  "data": {
    "provider": "youtube",
    "username": "@example",
    "name": "Example Channel",
    "subscribers": 2500
  }
}
```

### Failure response

```json
{
  "success": false,
  "succcess": false,
  "status": "failed",
  "error": "Authorization failed",
  "data": {
    "provider": "github",
    "error": "Authorization failed"
  }
}
```

## OAuth setup notes

- **YouTube**: Enable YouTube Data API v3; request the read-only YouTube scope. Register `CHATAPP_YOUTUBE_REDIRECT_URI`.
- **GitHub**: Use an OAuth App; default scopes are `read:user user:email` (no repository access). Register `CHATAPP_GITHUB_REDIRECT_URI`.
- **Facebook**: Configure Facebook Login and `email public_profile`. Register `CHATAPP_FACEBOOK_REDIRECT_URI`.
- **X**: Enable OAuth 2.0 Authorization Code with PKCE. Default scopes are `tweet.read users.read`; no write permission or offline access. Register `CHATAPP_X_REDIRECT_URI`.
- **LinkedIn**: Enable “Sign In with LinkedIn using OpenID Connect” and the `openid profile email` scopes. Register `CHATAPP_LINKEDIN_REDIRECT_URI`. LinkedIn does not expose connection counts through this OIDC profile endpoint, so the count is `null` rather than a fabricated zero.

## Security

- Never commit `.env` or provider secrets.
- OAuth tokens are used server-side only and are not returned to clients or stored by this service.
- Use a random secret for `SOCIAL_STATE_SECRET`; keep it stable across instances during an OAuth flow.
- Avoid putting OAuth authorization codes, tokens, or secrets in support tickets or logs.
