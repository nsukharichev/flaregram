import { after, test } from 'node:test';
import assert from 'node:assert/strict';

import worker from '../src/deploy.js';
import { app } from '../src/flaregram/client.js';
import { bot } from '../src/flaregram/bot.js';

const originalSend = bot.message.sendMessage;
after(() => { bot.message.sendMessage = originalSend; });

// Exercise registered command handlers without reaching the Telegram API.
async function runCommand(command, chatId = 123456789) {
  const messages = [];
  const pending = [];
  bot.message.sendMessage = async (payload) => {
    messages.push(payload);
    return { ok: true };
  };

  await app.dispatchUpdate(
    { message: { chat: { id: chatId }, text: command } },
    { waitUntil(promise) { pending.push(promise); } }
  );
  await Promise.all(pending);

  assert.equal(messages.length, 1, 'command should send one reply');
  assert.equal(messages[0].chat_id, chatId);
  assert.equal(messages[0].parse_mode, 'HTML', 'replies must avoid Markdown parsing');
  return messages[0].text;
}

test('/start and /help list available commands', async () => {
  assert.match(await runCommand('/start'), /Send \/help/);
  const help = await runCommand('/help');
  for (const cmd of ['/start', '/help', '/ping', '/about', '/dice', '/coin', '/id', '/dog']) {
    assert.ok(help.includes(cmd), cmd + ' missing from /help');
  }
});

test('/ping and /about reply', async () => {
  assert.match(await runCommand('/ping'), /Pong/);
  assert.match(await runCommand('/about'), /Cloudflare Workers/);
});

test('/dice always rolls an integer from 1 through 6', async () => {
  for (let i = 0; i < 30; i += 1) {
    assert.match(await runCommand('/dice'), /You rolled [1-6]\./);
  }
});

test('/coin replies with Heads or Tails', async () => {
  for (let i = 0; i < 20; i += 1) {
    assert.match(await runCommand('/coin'), /(?:Heads|Tails)!/);
  }
});

test('/id returns the chat ID without formatting', async () => {
  assert.equal(await runCommand('/id', -1001234567890), 'This chat ID: -1001234567890');
});

test('/dog renders a multiline ASCII dog', async () => {
  const art = await runCommand('/dog');
  assert.ok(art.includes('@\\___'));
  assert.equal(art.split('\n').length, 5);
});

test('unauthenticated webhook and setup routes remain blocked', () => {
  const noContext = {};
  const setup = worker.fetch(new Request('https://example.com/set-webhook'), noContext, noContext);
  assert.equal(setup.status, 404);

  const webhook = worker.fetch(
    new Request('https://example.com/bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }),
    { BOT_TOKEN: 'example', SECRET_TOKEN: 'example' },
    noContext
  );
  assert.equal(webhook.status, 403);
});
