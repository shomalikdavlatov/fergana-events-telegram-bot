const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const { handler } = require('./controllers/index');

const app = express();
const port = process.env.PORT || 4040;

app.use(express.json());

app.post('*\w', async (req, res) => {
    res.send(await handler(req));
});

app.get("*\w", async (req, res) => {
    res.send(await handler(req));
});

app.listen(port, () => {
  console.log(`Telegram Bot listening on port ${port}`);
});
