// Production starter for the Flaregram framework.
// Deploy with: npx wrangler deploy --config wrangler.deploy.toml
// Configure BOT_TOKEN and SECRET_TOKEN as encrypted Cloudflare Worker secrets.
import { app } from './flaregram/client.js';
import { bot } from './flaregram/bot.js';

// Use Telegram's supported HTML mode for these unformatted messages.
// That avoids the framework's Markdown default mangling backslashes/underscores in ASCII art.
function onCommand(command, makeText) {
  app.on_message(command, (update, ctx) => {
    const chatId = update.message?.chat?.id;
    if (chatId == null) return;
    const text = typeof makeText === 'function' ? makeText(update) : makeText;
    ctx.waitUntil(bot.message.sendMessage({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }));
  });
}

const HELP_TEXT = [
  'Flaregram commands:',
  '/start — Welcome message',
  '/help — List all commands',
  '/ping — Check if the bot is online',
  '/about — About this bot',
  '/dice — Roll a six-sided die',
  '/coin — Flip a coin',
  '/id — Show this chat ID',
  '/dog — Show an ASCII dog',
].join('\n');

const DOG_ART = [
  ' / \\__',
  '(    @\\___',
  ' /         O',
  '/   (_____/',
  '/_____/   U',
].join('\n');

onCommand('/start', 'Flaregram is online. Send /help to see available commands.');
onCommand('/help', HELP_TEXT);
onCommand('/ping', '🏓 Pong! Flaregram is online.');
onCommand('/about', 'Flaregram is a lightweight Telegram bot running on Cloudflare Workers.');
onCommand('/dice', () => '🎲 You rolled ' + (Math.floor(Math.random() * 6) + 1) + '.');
onCommand('/coin', () => '🪙 ' + (Math.random() < 0.5 ? 'Heads' : 'Tails') + '!');
onCommand('/id', (update) => 'This chat ID: ' + update.message.chat.id);
onCommand('/dog', DOG_ART);

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
