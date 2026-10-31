# Deploy Flaregram to Cloudflare Workers (Free tier)

The repository is a Telegram **framework**. The committed `src/deploy.js`
is a small production starter bot, separate from the local-development
`src/index.js` (which is intentionally gitignored).

## Deployed endpoint

- Worker name: `flaregram`
- URL: https://flaregram.nick-sukharichev.workers.dev
- Health: `GET /`
- Telegram webhook: `POST /bot`

## Free-tier design

The deployment uses a single Worker with no KV, D1, R2, Durable Objects,
Queues, cron jobs, or other paid bindings. The Workers Free plan enforces
**100,000 requests per day shared across the account** and
**10 ms CPU time per request**. When a free-plan limit is exhausted,
requests can fail; do not upgrade to Workers Paid unless you intend to pay.
Cloudflare currently does not permit setting an explicit CPU limit on
Workers Free, so the plan's built-in limit is used.

## Redeploy

From the repository root:

```sh
npm ci
npx wrangler deploy --config wrangler.deploy.toml
```

The default `wrangler.toml` is for framework development and points to
the gitignored `src/index.js`. Always select `wrangler.deploy.toml` for
this starter deployment.

## Enable Telegram updates

1. Obtain a bot token from Telegram's `@BotFather`.
2. Generate a random webhook secret that Telegram accepts
   (16–256 characters using letters, digits, underscores, and hyphens).
3. Set the **same two values** as encrypted Worker secrets, one at a time:

```sh
npx wrangler secret put BOT_TOKEN --config wrangler.deploy.toml
npx wrangler secret put SECRET_TOKEN --config wrangler.deploy.toml
```

4. Copy `.dev.vars.sample` to `.dev.vars` (it is gitignored),
   enter `BOT_TOKEN` and `SECRET_TOKEN`, then register the webhook:

```sh
npm run flaregram -- webhook set --url https://flaregram.nick-sukharichev.workers.dev
npm run flaregram -- webhook info
```

The command registers `/bot` automatically. Keep your bot token and
secret private. Do not commit `.dev.vars`.

## Starter bot commands

Edit src/deploy.js to customize the bot.

| Command | Behavior |
| --- | --- |
| /start | Welcome message |
| /help | List all commands |
| /ping | Reply with an online-status ping |
| /about | Describe Flaregram |
| /dice | Roll a random integer from 1 to 6 |
| /coin | Randomly select Heads or Tails |
| /id | Show the current Telegram chat ID |
| /dog | Show an ASCII dog |

The commands use existing Worker bindings and the Telegram API only;
no storage, scheduled jobs, or paid services are needed. Replies are
sent without Markdown formatting so the parser cannot alter ASCII art.
They can be invoked by typing the slash command directly in Telegram.
To display them in Telegram's command picker, send /setcommands to
@BotFather and provide the commands and descriptions.

## Safety

Until **both** Worker secrets are configured, `POST /bot` returns 503.
Requests with an incorrect Telegram secret header return 403.
The framework's unauthenticated `POST /set-webhook` endpoint is blocked
in `src/deploy.js`. Register webhooks only through the trusted local CLI.
