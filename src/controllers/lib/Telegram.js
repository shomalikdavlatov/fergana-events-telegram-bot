import axiosInstance from './axios.js';

const mediaGroups = new Map();

function sendMessage(messageObj, messageText) {
    return axiosInstance.get("sendMessage", {
        chat_id: messageObj.chat.id,
        text: messageText,
    });
}

function sendToAdmin(messageObj) {
    const messageText = `Name of sender: ${
        messageObj.from.first_name} ${messageObj.from.last_name ? messageObj.from.last_name : ""
    }\nUsername: ${messageObj.from.username ? '@' + messageObj.from.username : "-"}\nUser ID: ${
        messageObj.from.id
    }\n\nMessage: ${messageObj.text}`;
    const OWNER_ID = process.env.OWNER_ID;
    return axiosInstance.get("sendMessage", {
        chat_id: OWNER_ID,
        text: messageText,
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
        if (messageObj.from.id != process.env.OWNER_ID) {
            sendToAdmin(messageObj);
            return sendMessage(
                messageObj,
                "We got your event post! Admin will check them soon 👀"
            );
        }
    }
}

async function handleTelegramUpdate(update) {
    if (!update.message) return;
    const msg = update.message;

    if (msg.media_group_id) {
        const groupId = msg.media_group_id;

        if (!mediaGroups.has(groupId)) {
            mediaGroups.set(groupId, {
                chat_id: msg.chat.id,
                from_id: msg.from.id,
                photos: [],
                caption: null,
                timeout: null,
            });
        }

        const group = mediaGroups.get(groupId);

        group.photos.push(msg.photo[msg.photo.length - 1].file_id);

        if (msg.caption) group.caption = msg.caption;

        clearTimeout(group.timeout);

        group.timeout = setTimeout(async () => {
            await finalizeMediaGroup(group);
            mediaGroups.delete(groupId);
        }, 1000);
    } else {
        handleMessage(msg);
    }
}

async function finalizeMediaGroup(group) {
    const OWNER_ID = process.env.OWNER_ID;

    const media = group.photos.map((fileId, index) => ({
        type: "photo",
        media: fileId,
        caption: index === 0 ? group.caption || "" : undefined,
    }));

    await axiosInstance.post("sendMediaGroup", {
        chat_id: OWNER_ID,
        media: JSON.stringify(media),
    });

    await axiosInstance.get("sendMessage", {
        chat_id: group.chat_id,
        text: "We got your event post! Admin will check them soon 👀",
    });
}

export { handleTelegramUpdate };
