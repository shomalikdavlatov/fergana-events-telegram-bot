import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import https from 'https';
import express from 'express';
import { handleTelegramUpdate } from './controllers/lib/Telegram.js';

const app = express();
const port = process.env.PORT || 8443;
const SECRET = process.env.WEBHOOK_SECRET;

app.use(express.json());

app.get('/', (req, res) => res.send('OK'));

app.post('/webhook', (req, res) => {
  if (SECRET && req.get('x-telegram-bot-api-secret-token') !== SECRET) {
    return res.sendStatus(403);
  }
  res.sendStatus(200); // answer Telegram immediately
  handleTelegramUpdate(req.body).catch((e) =>
    console.error('Update error:', e.response?.data || e.message)
  );
});

const keyPath = path.resolve('certs/key.pem');
const certPath = path.resolve('certs/cert.pem');

https
  .createServer(
    { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) },
    app
  )
  .listen(port, '0.0.0.0', () =>
    console.log(`Telegram bot listening on https://0.0.0.0:${port}`)
  );