const mongoose = require("mongoose");

mongoose.set("strictQuery", false);

const chatSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            index: true
        },
        conversations: [
            {
                role: {
                    type: String,
                    required: true,
                    enum: ["system", "user", "assistant"]
                },
                content: {
                    type: String,
                    required: true
                },
                timestamp: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        lastUpdate: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    {
        timestamps: true
    }
);

chatSchema.pre("save", function (next) {
    if (this.conversations.filter(msg => msg.role !== "system").length > 65) {
        const systemMessages = this.conversations.filter(
            msg => msg.role === "system"
        );
        const recentMessages = this.conversations
            .filter(msg => msg.role !== "system")
            .slice(-64);
        this.conversations = [...systemMessages, ...recentMessages];
    }
    next();
});

const Chat = mongoose.model("Chat", chatSchema);

// Buffer untuk menyimpan pesan sementara
let messageBuffer = new Map();
let isProcessing = false;
const MAX_BUFFER_SIZE = 5000;

// Fungsi untuk memproses buffer dan menyimpan ke DB
async function processMessageBuffer() {
    if (isProcessing || messageBuffer.size === 0) return;
    
    isProcessing = true;
    const currentBuffer = new Map(messageBuffer);
    messageBuffer.clear();

    try {
        const updates = Array.from(currentBuffer.entries()).map(async ([userId, messages]) => {
            const chat = await Chat.findOne({ userId });
            if (!chat) return;

            chat.conversations.push(...messages);
            chat.lastUpdate = new Date();
            return chat.save();
        });

        await Promise.all(updates);
        console.log(`Processed ${currentBuffer.size} chat updates`);
    } catch (error) {
        console.error('Error processing message buffer:', error);
        // Mengembalikan pesan yang gagal diproses ke buffer
        for (const [userId, messages] of currentBuffer.entries()) {
            if (!messageBuffer.has(userId)) {
                messageBuffer.set(userId, messages);
            } else {
                messageBuffer.get(userId).push(...messages);
            }
        }
    } finally {
        isProcessing = false;
    }
}

// Jalankan processor setiap 5 detik
setInterval(processMessageBuffer, 5000);

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.mongodb, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);

        await Chat.collection.createIndex({ userId: 1 });
        await Chat.collection.createIndex({ lastUpdate: 1 });
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
};

mongoose.connection.on("disconnected", () => {
    console.log("MongoDB disconnected! Attempting to reconnect...");
    setTimeout(connectDB, 5000);
});

mongoose.connection.on("error", err => {
    console.error("MongoDB connection error:", err);
});

async function updateAllChatsSystemMessages() {
    try {
        const chats = await Chat.find({});

        for (const chat of chats) {
            chat.conversations = chat.conversations.filter(
                msg => msg.role !== "system"
            );

            chat.conversations.unshift(...defaultSystemMessages);

            await chat.save();
        }

        console.log("Successfully updated all chats with new system messages");
    } catch (error) {
        console.error("Error updating system messages:", error);
    }
}

async function getOrCreateChat(userId) {
    try {
        let chat = await Chat.findOne({ userId });

        if (!chat) {
            chat = new Chat({
                userId,
                conversations: [...defaultSystemMessages]
            });
            await chat.save();
        } else {
            const currentSystemMessages = chat.conversations.filter(
                msg => msg.role === "system"
            );
            if (
                JSON.stringify(currentSystemMessages) !==
                JSON.stringify(defaultSystemMessages)
            ) {
                chat.conversations = [
                    ...defaultSystemMessages,
                    ...chat.conversations.filter(msg => msg.role !== "system")
                ];
                await chat.save();
            }
        }

        return chat;
    } catch (error) {
        console.error("Error in getOrCreateChat:", error);
        throw error;
    }
}

async function updateChat(chat, newMessage) {
    try {
        if (!messageBuffer.has(chat.userId)) {
            messageBuffer.set(chat.userId, []);
        }
        messageBuffer.get(chat.userId).push(newMessage);

        // Force process jika buffer terlalu besar
        if (messageBuffer.size >= MAX_BUFFER_SIZE) {
            processMessageBuffer();
        }

        return {
            ...chat.toObject(),
            conversations: [...chat.conversations, newMessage],
            lastUpdate: new Date()
        };
    } catch (error) {
        console.error("Error in updateChat:", error);
        throw error;
    }
}

async function flushMessageBuffer() {
    if (messageBuffer.size > 0) {
        await processMessageBuffer();
    }
}

setInterval(
    async () => {
        try {
            const thirtyDaysAgo = new Date(
                Date.now() - 30 * 24 * 60 * 60 * 1000
            );
            const result = await Chat.deleteMany({
                lastUpdate: { $lt: thirtyDaysAgo }
            });
            console.log(`Cleaned ${result.deletedCount} old chat records`);
        } catch (error) {
            console.error("Error in cleanup routine:", error);
        }
    },
    24 * 60 * 60 * 1000
);

// Handler untuk graceful shutdown
process.on('SIGTERM', async () => {
    await flushMessageBuffer();
    process.exit(0);
});

module.exports = {
    connectDB,
    Chat,
    getOrCreateChat,
    updateChat,
    updateAllChatsSystemMessages,
    flushMessageBuffer
};