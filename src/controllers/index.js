const { handleMessage, handleTelegramUpdate } = require('../controllers/lib/Telegram');

async function handler(req, method) {
    const body = req.body;

    if (body) {
        await handleTelegramUpdate(body);
    }
}

module.exports = { handler };