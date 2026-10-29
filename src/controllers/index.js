
import { handleTelegramUpdate } from './lib/Telegram.js';

async function handler(update) {
    if (!update || typeof update !== 'object') {
        throw new Error('Invalid Telegram update');
    }

    await handleTelegramUpdate(update);
}

export { handler };
