## Start ngrok

Open a new terminal and run:

```bash
ngrok http 3000
```

You will see output like:

```
Forwarding    https://abc123.ngrok.io -> http://localhost:3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`).

## Set the Webhook

Open your browser and navigate to:

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_NGROK_URL>/webhook
```

Replace:
- `<YOUR_BOT_TOKEN>` with your actual bot token
- `<YOUR_NGROK_URL>` with your ngrok HTTPS URL

Example:
```
https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz/setWebhook?url=https://abc123.ngrok.io/webhook
```

You should see a success response:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```