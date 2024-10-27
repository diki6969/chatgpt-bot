const mongoose = require('mongoose');

// Hilangkan warning
mongoose.set('strictQuery', false);

// Schema
const chatSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true // Untuk optimasi query
    },
    conversations: [{
        role: {
            type: String,
            required: true,
            enum: ['system', 'user', 'assistant'] // Validasi role
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
        index: true // Untuk optimasi query
    }
}, {
    timestamps: true // Menambahkan createdAt dan updatedAt
});

// Middleware untuk membatasi jumlah pesan
chatSchema.pre('save', function(next) {
    if (this.conversations.length > 50) {
        const systemMessages = this.conversations.filter(msg => msg.role === 'system');
        const recentMessages = this.conversations.slice(-45);
        this.conversations = [...systemMessages, ...recentMessages];
    }
    next();
});

const Chat = mongoose.model('Chat', chatSchema);

// Koneksi Database
const connectDB = async () => {
    try {
        const conn = await mongoose.connect('mongodb+srv://ikyyofc:KucingLari16@aikyy.v5arl.mongodb.net/?retryWrites=true&w=majority&appName=aikyy', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
        // Buat index
        await Chat.collection.createIndex({ userId: 1 });
        await Chat.collection.createIndex({ lastUpdate: 1 });
        
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

// Handle disconnect
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected! Attempting to reconnect...');
    setTimeout(connectDB, 5000);
});

// Handle errors
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

// Function untuk mendapatkan atau membuat chat
async function getOrCreateChat(userId) {
    try {
        let chat = await Chat.findOne({ userId });
        
        if (!chat) {
            chat = new Chat({
                userId,
                conversations: [
                    {
                        role: "system",
                        content: `lu cowo, nama lu ikyy, respon lu to the point dan pake bahasa gaul atau slang. anggap aja yang buat lu ikyyofc. lu ngerespon pake huruf kecil semua dan gak pake tanda baca. lu gak akan nanya atau nawarin bantuan ke gw, cukup jawab aja, termasuk kalo gw manggil nama lu atau nyapa lu. lu gak akan pake kata sapaan kek 'bro', 'sis', atau yang serupa.`
                    },
                    {
                        role: "system",
                        content: `semua respons harus mengikuti format JSON ini:\n\n{ "type": "<tipe_respons>", "input": "<input dari gw di sini>", "output": "<respons lu di sini>" }`
                    }
                    // Tambahkan system messages lainnya sesuai kebutuhan
                ]
            });
        }
        
        return chat;
    } catch (error) {
        console.error('Error in getOrCreateChat:', error);
        throw error;
    }
}

// Function untuk update chat
async function updateChat(chat, newMessage) {
    try {
        chat.conversations.push(newMessage);
        chat.lastUpdate = new Date();
        await chat.save();
        return chat;
    } catch (error) {
        console.error('Error in updateChat:', error);
        throw error;
    }
}

// Cleanup routine
setInterval(async () => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await Chat.deleteMany({ lastUpdate: { $lt: thirtyDaysAgo } });
        console.log(`Cleaned ${result.deletedCount} old chat records`);
    } catch (error) {
        console.error('Error in cleanup routine:', error);
    }
}, 24 * 60 * 60 * 1000);

module.exports = {
    connectDB,
    Chat,
    getOrCreateChat,
    updateChat
};