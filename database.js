const mongoose = require("mongoose");
const { EventEmitter } = require('events');

mongoose.set("strictQuery", false);

const chatSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    conversations: [{
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
    }],
    lastUpdate: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: true });

chatSchema.pre("save", function(next) {
    const systemMessages = this.conversations.filter(msg => msg.role === "system");
    const userAssistantMessages = this.conversations.filter(msg => msg.role !== "system").slice(-64);
    this.conversations = [...systemMessages, ...userAssistantMessages];
    next();
});

const Chat = mongoose.model("Chat", chatSchema);

class BufferManager extends EventEmitter {
    constructor(maxSize = 5000, flushInterval = 5000) {
        super();
        this.buffer = new Map();
        this.maxSize = maxSize;
        this.flushInterval = flushInterval;
        this.isProcessing = false;
        this.startAutoFlush();
    }

    add(userId, message) {
        if (!this.buffer.has(userId)) {
            this.buffer.set(userId, []);
        }
        this.buffer.get(userId).push(message);
        if (this.buffer.size >= this.maxSize) {
            this.flush();
        }
    }

    startAutoFlush() {
        setInterval(() => this.flush(), this.flushInterval);
    }

    async flush() {
        if (this.isProcessing || this.buffer.size === 0) return;
        this.isProcessing = true;
        const currentBuffer = new Map(this.buffer);
        this.buffer.clear();

        try {
            const bulkOps = Array.from(currentBuffer.entries()).map(([userId, messages]) => ({
                updateOne: {
                    filter: { userId },
                    update: {
                        $push: { conversations: { $each: messages } },
                        $set: { lastUpdate: new Date() }
                    },
                    upsert: true
                }
            }));

            await Chat.bulkWrite(bulkOps);
            console.log(`Processed ${currentBuffer.size} chat updates`);
            this.emit('flushed', currentBuffer.size);
        } catch (error) {
            console.error('Error flushing buffer:', error);
            // Return failed messages to buffer
            for (const [userId, messages] of currentBuffer.entries()) {
                this.add(userId, ...messages);
            }
            this.emit('flushError', error);
        } finally {
            this.isProcessing = false;
        }
    }
}

const bufferManager = new BufferManager();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.mongodb, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            maxPoolSize: 10
        });
        console.log(`MongoDB Connected: ${mongoose.connection.host}`);
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
        const defaultSystemMessages = [/* Your default system messages here */];
        const bulkOps = await Chat.find({}).then(chats => 
            chats.map(chat => ({
                updateOne: {
                    filter: { _id: chat._id },
                    update: {
                        $set: {
                            conversations: [
                                ...defaultSystemMessages,
                                ...chat.conversations.filter(msg => msg.role !== "system")
                            ]
                        }
                    }
                }
            }))
        );

        await Chat.bulkWrite(bulkOps);
        console.log("Successfully updated all chats with new system messages");
    } catch (error) {
        console.error("Error updating system messages:", error);
    }
}

async function getOrCreateChat(userId) {
    try {
        const defaultSystemMessages = [/* Your default system messages here */];
        let chat = await Chat.findOne({ userId });

        if (!chat) {
            chat = new Chat({
                userId,
                conversations: [...defaultSystemMessages]
            });
            await chat.save();
        } else {
            const currentSystemMessages = chat.conversations.filter(msg => msg.role === "system");
            if (JSON.stringify(currentSystemMessages) !== JSON.stringify(defaultSystemMessages)) {
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
        bufferManager.add(chat.userId, newMessage);
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
    await bufferManager.flush();
}

// Cleanup old chats
setInterval(async () => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await Chat.deleteMany({ lastUpdate: { $lt: thirtyDaysAgo } });
        console.log(`Cleaned ${result.deletedCount} old chat records`);
    } catch (error) {
        console.error("Error in cleanup routine:", error);
    }
}, 24 * 60 * 60 * 1000);

// Graceful shutdown handler
process.on('SIGTERM', async () => {
    await flushMessageBuffer();
    await mongoose.connection.close();
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