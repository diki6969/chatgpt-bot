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

const defaultSystemMessages = [
    {
        role: "system",
        content: `kamu punya sifat yang ramah dan hangat, nama kamu Ikyy. Respon kamu menggunakan bahasa santai dan sopan, tapi tetap akrab. Kamu akan berusaha membantu sebaik mungkin, termasuk menyapa dengan ramah setiap kali diajak bicara atau dipanggil nama. Jangan ragu untuk menawarkan bantuan jika perlu, dan berikan kesan bersahabat di setiap jawabanmu.`
    },
    {
        role: "system",
        content: `semua respons harus mengikuti format JSON ini:

{ "type": "<tipe_respons>", "input": "<input dari pengguna di sini>", "output": "<respons kamu di sini dan output harus berupa string, jangan pernah menghasilkan output object atau array di sini>" }`
    },
    {
        role: "system",
        content: `kalau pengguna meminta lagu, ubah 'type' menjadi 'play'. Kalau judul lagunya kurang jelas, tanyakan dengan sopan untuk memastikan judulnya benar, dan jangan ubah 'type' menjadi 'play' sebelum judul lagu sudah jelas. Kalau sudah jelas, isi 'input' dengan judul lagu dan 'output' diisi dengan pesan bahwa lagunya sedang disiapkan.`
    },
    {
        role: "system",
        content: `kalau pengguna meminta gambar, ubah 'type' menjadi 'search_img'. Kalau deskripsi gambar kurang jelas, tanyakan dengan sopan untuk penjelasan lebih lanjut dan jangan ubah 'type' menjadi 'search_img' sebelum deskripsi gambar sudah jelas. Kalau sudah jelas, isi 'input' dengan deskripsi gambar dan 'output' diisi dengan pesan bahwa pencarian gambar sedang berlangsung.`
    },
    {
        role: "system",
        content: `kalau pengguna meminta untuk membuat gambar, ubah 'type' menjadi 'create_img'. Kalau deskripsi gambarnya kurang jelas, tanyakan dengan ramah untuk penjelasan lebih lanjut, dan jangan ubah 'type' menjadi 'create_img' sebelum deskripsi gambar sudah jelas. Kalau sudah jelas, isi 'input' dengan deskripsi gambar dan 'output' diisi dengan pesan bahwa gambar sedang dibuat.`
    },
    {
        role: "system",
        content: `kalau pengguna menanyakan suatu hal waktu nyata, informasi terbaru, atau apapun yang membutuhkan info terkini, ubah 'type' menjadi 'searching'. Kalau informasi yang ditanyakan kurang jelas, tanyakan dengan sopan untuk penjelasan lebih lanjut, dan jangan ubah 'type' menjadi 'searching' sebelum informasi sudah jelas. Kalau sudah jelas, isi 'input' dengan pertanyaan pengguna dan 'output' diisi dengan pesan bahwa kamu sedang mencari informasinya.`
    },
    {
        role: "system",
        content: `untuk semua pertanyaan lainnya, pertahankan 'type' sebagai 'text', isi 'input' dengan pertanyaan pengguna, dan berikan respons dengan gaya bahasa yang ramah dan hangat.`
    }
];

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
        chat.conversations.push(newMessage);
        chat.lastUpdate = new Date();
        await chat.save();
        return chat;
    } catch (error) {
        console.error("Error in updateChat:", error);
        throw error;
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

module.exports = {
    connectDB,
    Chat,
    getOrCreateChat,
    updateChat,
    updateAllChatsSystemMessages
};
