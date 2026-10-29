
import 'dotenv/config';
import express from 'express';
import https from 'node:https';
import fs from 'node:fs';
import { handler } from './controllers/index.js';

const app = express();
const port = Number(process.env.PORT || 8443);

if (!process.env.WEBHOOK_SECRET) {
    throw new Error('WEBHOOK_SECRET is missing from .env');
}

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
    res.status(200).send('Fergana Events Bot is running');
});

app.post('/telegram-webhook', async (req, res) => {
    const secret = req.get('X-Telegram-Bot-Api-Secret-Token');

    if (secret !== process.env.WEBHOOK_SECRET) {
        return res.sendStatus(403);
    }

    try {
        await handler(req.body);
        return res.sendStatus(200);
    } catch (error) {
        console.error('Failed to process Telegram update:', error);
        return res.sendStatus(500);
    }
});

const httpsOptions = {
    key: fs.readFileSync(
        new URL('../certs/private.key', import.meta.url)
    ),
    cert: fs.readFileSync(
        new URL('../certs/public.pem', import.meta.url)
    ),
};

https.createServer(httpsOptions, app).listen(port, '0.0.0.0', () => {
    console.log(`Fergana Events Bot listening on HTTPS port ${port}`);
});
