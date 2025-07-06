# @randajan/oauth2-client

[![NPM](https://img.shields.io/npm/v/@randajan/oauth2-client.svg)](https://www.npmjs.com/package/@randajan/oauth2-client) 
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

---

## Overview

**@randajan/oauth2-client** is a lightweight wrapper that streamlines OAuth 2.0 and service‑account authentication for Google APIs.  
It hides the boilerplate around `google-auth-library`, keeps tokens fresh and lets you focus on writing business logic instead of wiring endpoint plumbing.

This library meticulously supervises the entire redirect flow, intercepts every error, and relays it to the front-end, ensuring the browser is never stranded on a raw JSON API endpoint as can happen with other solutions.

### ESM **&** CommonJS ready

The package ships dual builds so you can **import** or **require** according to your tool‑chain:

```js
// ESM
import { GoogleOAuth2 } from "@randajan/oauth2-client/google";

// CommonJS
const { GoogleOAuth2 } = require("@randajan/oauth2-client/google");
```

---

## Quick start — minimal Express example

```js
import express from "express";
import { GoogleOAuth2 } from "@randajan/oauth2-client/google";

const google = new GoogleOAuth2({
  clientId:          process.env.GOOGLE_CLIENT_ID,
  clientSecret:      process.env.GOOGLE_CLIENT_SECRET,
  redirectUri:       "http://localhost:3999/oauth/exit",     // common backend route
  landingUri:        "http://localhost:3000",                // front‑end OK screen (default)
  fallbackUri:       "http://localhost:3000/login/error",    // front‑end error screen
  scopes:            ["drive"],                              // extra scopes
  isOffline:         true,                                   // ask for refresh_token
  onAuth: async (account, context) => {
    // first time we see this user
    console.log("new account", await account.uid());
    // store tokens somewhere safe …
  },
  onRenew: async account => {
    // Google issued fresh tokens
    console.log("tokens renewed for", account);
  },
  extra:{
    //will be passed to new google.auth.OAuth2(...)
  }
});

const app = express();

app.get("/oauth/init", (req, res) => {
  const redirect = google.getInitAuthURL(req.query.landingUri);
  res.redirect(redirect);
});

app.get("/oauth/exit", async (req, res) => {
  const redirect = await google.getExitAuthURL(req.query.code, req.query.state);
  res.redirect(redirect);           // back to front‑end
});

app.listen(3999);
```

---

## Shared `options`

Every concrete OAuth2 client (Google, Microsoft …​) accepts the same constructor options so you can swap providers without refactoring:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `clientId` | `string` | ✔︎ | OAuth client ID issued by the provider |
| `clientSecret` | `string` | ✔︎ | OAuth client secret |
| `redirectUri` | `string (URL)` | ✔︎ | Back‑end endpoint that receives `code` from the provider |
| `fallbackUri` | `string (URL)` | ✔︎ | Where to send the user when *anything* goes wrong. Error errorCode & errorMessage are appended as query params |
| `landingUri` | `string (URL)` |   | Default front‑end page after successful login (may be overridden per request) |
| `scopes` | `string \| string[]` |   | Extra scopes. Google is always invoked with `openid userinfo.profile userinfo.email` |
| `isOffline` | `boolean` |   | When `true` requests `access_type=offline` so a `refresh_token` is issued |
| `onAuth` | `(account) => Promise<string[] \| void>` | ✔︎ | Called once after new account is created. Return uri (string) for custom redirect |
| `onRenew` | `(account) => void` | ✔︎ | Called whenever the access‑token is automatically refreshed |
| `extra` | `object` |   | Arbitrary options forwarded to the underlying SDK |

---

## Google client

### Import path

```js
import { GoogleOAuth2 } from "@randajan/oauth2-client/google";
```

### Class **`GoogleOAuth2`**

| Member | Returns | Description |
|--------|---------|-------------|
| `constructor(options)` | `GoogleOAuth2` | Creates a new client. See **options** above |
| `getInitAuthURL(landingUri?, scopes?, generateOptions?)` | `string` | Generates the consent‑screen URL. Parameters override the defaults from the constructor |
| `getExitAuthURL({code, state}, context)` | `Promise<string>` | Exchanges `code` for tokens, triggers `onAuth`, then returns a redirect URL (either `landingUri` or a new **init** URL if more scopes are needed). Context will be passed as second argument to `onAuth` trait |
| `account(credentials)` | `GoogleAccount` | Converts raw token `credentials` into a handy account object |

### Class **`GoogleAccount`**

| Member | Returns | Description |
|--------|---------|-------------|
| **Property** `auth` | `google.auth.OAuth2` | *Raw* `google-auth-library` instance. Use it with any `googleapis` service |
| `uid()` | `Promise<string>` | Returns a stable user‑id (`google:{userId}`) |
| `profile()` | `Promise<google.oauth2#Userinfo>` | Shorthand for `GET /oauth2/v2/userinfo` |
| `tokens()` | `Promise<{ access_token, refresh_token, expiry_date, … }>` | Current token set (auto‑refreshes if needed) |
| `scopes()` | `Promise<string[]>` | Scopes granted to the current access_token |

---

## Utility tool

### `extendURL(url, query): string`

```js
import { extendURL } from "@randajan/oauth2-client";
extendURL("https://example.com", { foo: 1, bar: 2 });
// → "https://example.com/?foo=1&bar=2"
```

A tiny helper that appends query parameters while keeping the rest of the URL intact.

---

## License

MIT © [randajan](https://github.com/randajan)
