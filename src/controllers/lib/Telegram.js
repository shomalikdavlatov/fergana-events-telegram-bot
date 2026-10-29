import axiosInstance from "./axios.js";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

let OWNER_IDS = [];
try {
  const parsed = JSON.parse(process.env.OWNER_ID || "[]");
  OWNER_IDS = (Array.isArray(parsed) ? parsed : [parsed]).map(Number);
} catch {
  OWNER_IDS = [parseInt(process.env.OWNER_ID)];
}

const isOwner = (id) => OWNER_IDS.includes(id);
const RECEIVED = "We got your event post! Admin will check them soon 👀";
const TTL = 60 * 60 * 24 * 30; // 30 days

function sendMessage(chatId, text, extra = {}) {
  return axiosInstance.post("sendMessage", { chat_id: chatId, text, ...extra });
}

function getSenderInfo(from) {
  return `Name: ${from.first_name} ${from.last_name || ""}\nUsername: ${
    from.username ? "@" + from.username : "-"
  }\nUser ID: ${from.id}`;
}

async function forwardToAdmins(msg) {
  const info = getSenderInfo(msg.from);
  const mapping = JSON.stringify({
    chat_id: msg.chat.id,
    message_id: msg.message_id,
  });

  for (const ownerId of OWNER_IDS) {
    try {
      const fwd = await axiosInstance.post("forwardMessage", {
        chat_id: ownerId,
        from_chat_id: msg.chat.id,
        message_id: msg.message_id,
      });
      const fwdId = fwd.data.result.message_id;

      const infoMsg = await sendMessage(ownerId, info, {
        reply_to_message_id: fwdId,
      });
      const infoId = infoMsg.data.result.message_id;

      // Admin can reply to either the forwarded post or the info message
      await redis.set(`msg:${ownerId}:${fwdId}`, mapping, { ex: TTL });
      await redis.set(`msg:${ownerId}:${infoId}`, mapping, { ex: TTL });
    } catch (e) {
      console.error(`Failed to forward to admin ${ownerId}:`, e.response?.data || e.message);
    }
  }
}

async function handleAdminReply(msg) {
  if (!msg.reply_to_message || !isOwner(msg.from.id)) return false;

  let info = await redis.get(`msg:${msg.from.id}:${msg.reply_to_message.message_id}`);
  if (!info) return false;
  if (typeof info === "string") info = JSON.parse(info);

  try {
    await axiosInstance.post("copyMessage", {
      chat_id: info.chat_id,
      from_chat_id: msg.chat.id,
      message_id: msg.message_id,
      reply_to_message_id: info.message_id,
      allow_sending_without_reply: true,
    });
    await sendMessage(msg.chat.id, "✅ Reply sent to user!");
  } catch (e) {
    const reason = e.response?.data?.description || e.message;
    console.error("copyMessage failed:", e.response?.data || e.message);
    await sendMessage(msg.chat.id, `❌ Could not send reply: ${reason}`);
  }
  return true;
}

async function handleCommand(msg) {
  const command = msg.text.slice(1).split(/[\s@]/)[0];
  switch (command) {
    case "start":
      return sendMessage(msg.chat.id, "Welcome to Fergana Events Bot!");
    case "help":
      return sendMessage(
        msg.chat.id,
        "You can send events to this bot, and it will share them with the community if approved by the admin."
      );
    default:
      return sendMessage(
        msg.chat.id,
        `Command ${msg.text} is not recognized. Type /help for assistance.`
      );
  }
}

export async function handleTelegramUpdate(update) {
  const msg = update?.message;
  if (!msg || !msg.from) return;

  // 1. Admin replying to a forwarded post (this was missing in your version)
  if (await handleAdminReply(msg)) return;

  // 2. Commands
  if (msg.text && msg.text.startsWith("/")) {
    await handleCommand(msg);
    return;
  }

  // 3. Admin's own non-reply messages are ignored
  if (isOwner(msg.from.id)) return;

  // 4. Any user post (text, photo, album, video...) -> admins
  await forwardToAdmins(msg);

  // Send one confirmation per album
  if (msg.media_group_id) {
    const first = await redis.set(`mg:${msg.media_group_id}`, 1, { nx: true, ex: 120 });
    if (!first) return;
  }
  await sendMessage(msg.chat.id, RECEIVED);
}