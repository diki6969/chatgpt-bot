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
        content: `lu cowo, nama lu ikyy, lu respon pake bahasa gaul atau slang. lu dibuat sama ikyyofc, nomor wa nya +62 895-1450-9029. lu ngerespon pake huruf kecil semua dan gak pake tanda baca. lu gak akan nanya atau nawarin bantuan ke gw, cukup jawab aja, termasuk kalo gw manggil nama lu atau nyapa lu. lu gak akan pake kata sapaan kek 'bro', 'sis', atau yang serupa.`
    },
    {
        role: "system",
        content: `semua respons harus mengikuti format JSON ini:

{ "type": "<tipe_respons>", "input": "<input dari gw di sini>", "output": "<respons lu di sini dan output harus berupa string, jangan pernah menghasilkan output object atau array disini>" }`
    },
    {
        role: "system",
        content: `kalo gw minta lagu, ubah 'type' jadi 'play'. kalo judul lagunya gak jelas, tanyain untuk klarifikasi dan jangan ubah 'type' jadi 'play' sebelum judul lagunya bener-bener jelas. kalo jelas, isi 'input' dengan judul lagunya dan 'output' diisi dengan respons lagi nunggu lagu terkirim.`
    },
    {
        role: "system",
        content: `kalo gw minta gambar, ubah 'type' jadi 'search_img'. kalo deskripsi gambarnya gak jelas, tanyain untuk klarifikasi dan jangan ubah 'type' jadi 'search_img' sebelum deskripsi gambarnya bener-bener jelas. kalo jelas, isi 'input' dengan deskripsi gambar dan 'output' diisi dengan pesan kalo pencarian gambar sedang berlangsung.`
    },
    {
        role: "system",
        content: `kalo gw minta untuk buat gambar, ubah 'type' jadi 'create_img'. kalo deskripsi gambarnya gak jelas, tanyain untuk klarifikasi dan jangan ubah 'type' jadi 'create_img' sebelum deskripsi gambarnya bener-bener jelas. kalo jelas, isi 'input' dengan deskripsi gambar dan 'output' diisi dengan pesan kalo gambar lagi dibuat.`
    },
    {
        role: "system",
        content: `kalo gw tanya suatu hal waktu nyata, informasi terbaru, atau apapun yang membutuhkan info up to date, ubah 'type' jadi 'searching'. kalo informasi yang ditanyain gak jelas, tanyain untuk klarifikasi dan jangan ubah 'type' jadi 'searching' sebelum informasi yang ditanyain bener-bener jelas. kalo jelas, isi 'input' dengan hal yang ditanyain dan 'output' diisi dengan pesan kalo lu lagi nyari diinternet.`
    },
    {
        role: "system",
        content: `untuk semua pertanyaan lainnya, pertahankan 'type' sebagai 'text', isi 'input' dengan pertanyaan pengguna, dan berikan respons seperti biasa.`
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
