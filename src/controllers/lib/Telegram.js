// Telegram.js
import axiosInstance from './axios.js';

const OWNER_ID = process.env.OWNER_ID;

function sendMessage(messageObj, messageText) {
    return axiosInstance.get("sendMessage", {
        chat_id: messageObj.chat.id,
        text: messageText,
    });
}

function sendToAdmin(messageText, chat_id) {
    return axiosInstance.get("sendMessage", {
        chat_id: OWNER_ID,
        text: messageText,
    });
}

async function sendPhotoToAdmin(messageObj) {
    const photo = messageObj.photo[messageObj.photo.length - 1];
    const caption = messageObj.caption || "";
    
    const messageText = `Name of sender: ${messageObj.from.first_name} ${
        messageObj.from.last_name ? messageObj.from.last_name : ""
    }\nUsername: ${messageObj.from.username ? '@' + messageObj.from.username : "-"}\nUser ID: ${
        messageObj.from.id
    }\n\nCaption: ${caption}`;

    await axiosInstance.post("sendPhoto", {
        chat_id: OWNER_ID,
        photo: photo.file_id,
        caption: messageText,
    });
}

async function sendMediaGroupToAdmin(messageObj) {
    const messageText = `Name of sender: ${messageObj.from.first_name} ${
        messageObj.from.last_name ? messageObj.from.last_name : ""
    }\nUsername: ${messageObj.from.username ? '@' + messageObj.from.username : "-"}\nUser ID: ${
        messageObj.from.id
    }\n\nCaption: ${messageObj.caption || ""}`;

    await axiosInstance.get("sendMessage", {
        chat_id: OWNER_ID,
        text: messageText,
    });

    await axiosInstance.post("forwardMessage", {
        chat_id: OWNER_ID,
        from_chat_id: messageObj.chat.id,
        message_id: messageObj.message_id,
    });
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
                    "Welcome to Fergana Events Bot!"
                );
            case "help":
                return sendMessage(
                    messageObj,
                    "You can send events to this bot, and it will share them with the community if approved by the admin."
                );
            default:
                return sendMessage(
                    messageObj,
                    `Command ${messageText} is not recognized. Type /help for assistance.`
                );
        }
    } else {
        if (messageObj.from.id != parseInt(OWNER_ID)) {
            const messageText = `Name of sender: ${messageObj.from.first_name} ${
                messageObj.from.last_name ? messageObj.from.last_name : ""
            }\nUsername: ${messageObj.from.username ? '@' + messageObj.from.username : "-"}\nUser ID: ${
                messageObj.from.id
            }\n\nMessage: ${messageObj.text}`;
            
            sendToAdmin(messageText);
            return sendMessage(
                messageObj,
                "We got your event post! Admin will check them soon 👀"
            );
        }
    }
}

async function handleTelegramUpdate(update) {
    if (!update.message) return;
    
    console.log("Received a message");
    const msg = update.message;

    if (msg.media_group_id) {
        if (msg.from.id != parseInt(OWNER_ID)) {
            await sendMediaGroupToAdmin(msg);
            await sendMessage(msg, "We got your event post! Admin will check them soon 👀");
        }
        return;
    }
    
    if (msg.photo && msg.photo.length > 0) {
        if (msg.from.id != parseInt(OWNER_ID)) {
            await sendPhotoToAdmin(msg);
            await sendMessage(msg, "We got your event post! Admin will check them soon 👀");
        }
        return;
    }

    await handleMessage(msg);
}

export { handleTelegramUpdate };
