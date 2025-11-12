import { handleTelegramUpdate } from './lib/Telegram.js';

async function handler(req, method) {
    const body = req.body;

    if (body) {
        await handleTelegramUpdate(body);
    }
}

export { handler };