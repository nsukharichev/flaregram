// Production starter for the Flaregram framework.
// Deploy with: npx wrangler deploy --config wrangler.deploy.toml
// Configure BOT_TOKEN and SECRET_TOKEN as encrypted Cloudflare Worker secrets.
import { app } from './flaregram/client.js';
import { bot } from './flaregram/bot.js';

app.on_message('/start', (update, ctx) => {
  const chatId = update.message?.chat?.id;
  if (chatId == null) return;
  ctx.waitUntil(bot.message.sendMessage({
    chat_id: chatId,
    text: 'Flaregram is online. Send /help to see available commands.',
  }));
});

app.on_message('/help', (update, ctx) => {
  const chatId = update.message?.chat?.id;
  if (chatId == null) return;
  ctx.waitUntil(bot.message.sendMessage({
    chat_id: chatId,
    text: 'Commands: /start, /help',
  }));
});

export default {
  fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;

    // The library's built-in /set-webhook route has no authentication.
    // Never expose it publicly; register webhooks from a trusted CLI.
    if (pathname === '/set-webhook') {
      return new Response('Not Found', { status: 404 });
    }

    if (pathname === '/bot') {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
      }
      // Fail closed until BOTH secrets are configured.
      if (!env.BOT_TOKEN || !env.SECRET_TOKEN) {
        return new Response('Bot not configured', { status: 503 });
      }
      if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.SECRET_TOKEN) {
        return new Response('Forbidden', { status: 403 });
      }
      if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
        return new Response('Unsupported Media Type', { status: 415 });
      }
    }

    return app.launch(request, env, ctx);
  },
};
