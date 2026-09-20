import axiosInstance from "./axios.js";
import { Redis } from "@upstash/redis";

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

let OWNER_IDS = [];
try {
    OWNER_IDS = JSON.parse(process.env.OWNER_ID || "[]");
    if (!Array.isArray(OWNER_IDS)) {
        OWNER_IDS = [parseInt(process.env.OWNER_ID)];
    }
} catch (e) {
    OWNER_IDS = [parseInt(process.env.OWNER_ID)];
}

function sendMessage(messageObj, messageText) {
    return axiosInstance.get("sendMessage", {
        chat_id: messageObj.chat.id,
        text: messageText,
    });
}

function getSenderInfo(from) {
    return `Name: ${from.first_name} ${from.last_name || ""}\nUsername: ${
        from.username ? "@" + from.username : "-"
    }\nUser ID: ${from.id}`;
}

async function sendTextToAdmin(messageObj) {
    const senderInfo = getSenderInfo(messageObj.from);
    for (const ownerId of OWNER_IDS) {
        try {
            const forwardedMsg = await axiosInstance.post("forwardMessage", {
                chat_id: ownerId,
                from_chat_id: messageObj.chat.id,
                message_id: messageObj.message_id,
            });

            await axiosInstance.get("sendMessage", {
                chat_id: ownerId,
                text: senderInfo,
                reply_to_message_id: forwardedMsg.data.result.message_id,
            });

            // Save to Redis directly
            await redis.set(
                `msg:${forwardedMsg.data.result.message_id}`,
                JSON.stringify({
                    chat_id: messageObj.chat.id,
                    message_id: messageObj.message_id,
                }),
            );
        } catch (error) {
            console.error(`Failed to send text to admin ${ownerId}:`, error.message);
        }
    }
}

async function sendPhotoToAdmin(messageObj) {
    const senderInfo = getSenderInfo(messageObj.from);
    for (const ownerId of OWNER_IDS) {
        try {
            const forwardedMsg = await axiosInstance.post("forwardMessage", {
                chat_id: ownerId,
                from_chat_id: messageObj.chat.id,
                message_id: messageObj.message_id,
            });

            await axiosInstance.get("sendMessage", {
                chat_id: ownerId,
                text: senderInfo,
                reply_to_message_id: forwardedMsg.data.result.message_id,
            });

            await redis.set(
                `msg:${forwardedMsg.data.result.message_id}`,
                JSON.stringify({
                    chat_id: messageObj.chat.id,
                    message_id: messageObj.message_id,
                }),
            );
        } catch (error) {
            console.error(`Failed to send photo to admin ${ownerId}:`, error.message);
        }
    }
}

async function sendMediaGroupToAdmin(messageObj) {
    const senderInfo = getSenderInfo(messageObj.from);
    for (const ownerId of OWNER_IDS) {
        try {
            const forwardedMsg = await axiosInstance.post("forwardMessage", {
                chat_id: ownerId,
                from_chat_id: messageObj.chat.id,
                message_id: messageObj.message_id,
            });

            await axiosInstance.get("sendMessage", {
                chat_id: ownerId,
                text: senderInfo,
                reply_to_message_id: forwardedMsg.data.result.message_id,
            });

            await redis.set(
                `msg:${forwardedMsg.data.result.message_id}`,
                JSON.stringify({
                    chat_id: messageObj.chat.id,
                    message_id: messageObj.message_id,
                }),
            );
        } catch (error) {
            console.error(`Failed to send media group to admin ${ownerId}:`, error.message);
        }
    }
}

async function handleAdminReply(messageObj) {
    if (
        !messageObj.reply_to_message ||
        !OWNER_IDS.includes(messageObj.from.id)
    ) {
        return false;
    }

    // Get message info from Redis
    const originalMessageInfo = await redis.get(
        `msg:${messageObj.reply_to_message.message_id}`,
    );

    if (!originalMessageInfo) {
        // Fallback: check if replying to sender info message
        const senderInfoMessageId = messageObj.reply_to_message.message_id;

        try {
            const keys = await redis.keys("msg:*");

            for (const key of keys) {
                const msgId = parseInt(key.replace("msg:", ""));
                if (Math.abs(msgId - senderInfoMessageId) === 1) {
                    const messageInfo = await redis.get(key);

                    if (messageInfo) {
                        if (messageObj.text) {
                            await axiosInstance.get("sendMessage", {
                                chat_id: messageInfo.chat_id,
                                text: messageObj.text,
                                reply_to_message_id: messageInfo.message_id,
                            });
                        } else if (messageObj.photo) {
                            await axiosInstance.post("sendPhoto", {
                                chat_id: messageInfo.chat_id,
                                photo: messageObj.photo[
                                    messageObj.photo.length - 1
                                ].file_id,
                                caption: messageObj.caption || "",
                                reply_to_message_id: messageInfo.message_id,
                            });
                        }
                        return true;
                    }
                }
            }
        } catch (error) {
            console.error("Error in fallback search:", error);
        }

        return false;
    }

    if (messageObj.text) {
        await axiosInstance.get("sendMessage", {
            chat_id: originalMessageInfo.chat_id,
            text: messageObj.text,
            reply_to_message_id: originalMessageInfo.message_id,
        });
    } else if (messageObj.photo) {
        await axiosInstance.post("sendPhoto", {
            chat_id: originalMessageInfo.chat_id,
            photo: messageObj.photo[messageObj.photo.length - 1].file_id,
            caption: messageObj.caption || "",
            reply_to_message_id: originalMessageInfo.message_id,
        });
    }

    return true;
}

function handleMessage(messageObj) {
    const messageText = messageObj.text;
    if (!messageText) return;

    if (messageText.startsWith("/")) {
        const command = messageText.substring(1);
        switch (command) {
            case "start":
                return sendMessage(
                    messageObj,
                    "Welcome to Fergana Events Bot!",
                );
            case "help":
                return sendMessage(
                    messageObj,
                    "You can send events to this bot, and it will share them with the community if approved by the admin.",
                );
            default:
                return sendMessage(
                    messageObj,
                    `Command ${messageText} is not recognized. Type /help for assistance.`,
                );
        }
    } else {
        if (!OWNER_IDS.includes(messageObj.from.id)) {
            sendTextToAdmin(messageObj);
            return sendMessage(
                messageObj,
                "We got your event post! Admin will check them soon 👀",
            );
        }
    }
}

async function handleTelegramUpdate(update) {
    if (!update.message) return;

    const msg = update.message;

    const wasReply = await handleAdminReply(msg);
    if (wasReply) {
        await sendMessage(msg, "✅ Reply sent to user!");
        return;
    }

    if (msg.media_group_id) {
        if (!OWNER_IDS.includes(msg.from.id)) {
            await sendMediaGroupToAdmin(msg);
            await sendMessage(
                msg,
                "We got your event post! Admin will check them soon 👀",
            );
        }
        return;
    }

    if (msg.photo && msg.photo.length > 0) {
        if (!OWNER_IDS.includes(msg.from.id)) {
            await sendPhotoToAdmin(msg);
            await sendMessage(
                msg,
                "We got your event post! Admin will check them soon 👀",
            );
        }
        return;
    }

    await handleMessage(msg);
}

export { handleTelegramUpdate };
