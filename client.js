require("./config");
const baileys = require("@whiskeysockets/baileys");
const ai = require("unlimited-ai");
const axios = require("axios");
const {
    default: makeWaSocket,
    useMultiFileAuthState,
    PHONENUMBER_MCC
} = baileys;
const Pino = require("pino"),
    fs = require("fs"),
    path = require("path"),
    colors = require("@colors/colors/safe");

const {
    connectDB,
    getOrCreateChat,
    updateChat,
    updateAllChatsSystemMessages
} = require("./database");
const { jsonFormat, simpleBind } = require("./lib/simple");

class ApiFeature {
    constructor() {
        this.endpoints = {
            nazuna: "https://api.nazuna.my.id/api/",
            widipe: "https://widipe.com/",
            itzpire: "https://itzpire.com/"
        };
        this.axiosInstance = axios.create({
            timeout: 10000,
            headers: {
                accept: "*/*"
            }
        });
    }

    async makeRequest(baseURL, endpoint, options = {}) {
        const { data, ...params } = options;
        const method = data ? "POST" : "GET";

        try {
            const response = await this.axiosInstance({
                baseURL,
                url: endpoint,
                method,
                ...(method === "GET" && { params }),
                ...(method === "POST" && { data })
            });
            return response.data;
        } catch (e) {
            return e.response?.data || e;
        }
    }

    nazuna = (endpoint, options) =>
        this.makeRequest(this.endpoints.nazuna, endpoint, options);
    widipe = (endpoint, options) =>
        this.makeRequest(this.endpoints.widipe, endpoint, options);
    itzpire = (endpoint, options) =>
        this.makeRequest(this.endpoints.itzpire, endpoint, options);
}

let Api = new ApiFeature();

let chatWithGPT = async data_msg => {
    try {
        const model = "gemini-1.5-pro-exp-0827";
        const res = await ai.generate(model, data_msg);
        return jsonFormat(res);
    } catch (e) {
        return jsonFormat(e);
    }
};

const connect = async () => {
    await connectDB();
    await updateAllChatsSystemMessages();
    console.log(colors.green("Connecting..."));
    const { state, saveCreds } = await useMultiFileAuthState("session");
    const config = JSON.parse(fs.readFileSync("./pairing.json", "utf-8"));

    const kyy = makeWaSocket({
        printQRInTerminal: !config.pairing?.state || !config.pairing.number,
        auth: state,
        browser: ["Chrome (Linux)", "", ""],
        logger: Pino({ level: "silent" })
    });
    simpleBind(kyy);

    if (
        config.pairing &&
        config.pairing.state &&
        !kyy.authState.creds.registered
    ) {
        const phoneNumber = config.pairing.number;
        if (
            !Object.keys(PHONENUMBER_MCC).some(v =>
                String(phoneNumber).startsWith(v)
            )
        ) {
            console.log(colors.red("Invalid phone number"));
            return;
        }
        setTimeout(async () => {
            try {
                let code = await kyy.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(colors.yellow("Pairing Code:" + code));
            } catch (error) {
                console.error("Error requesting pairing code:", error);
            }
        }, 3000);
    }

    kyy.ev.on("creds.update", saveCreds);
    kyy.ev.on("connection.update", async update => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
            console.log(
                colors.green("Successfully Connected With ") +
                    colors.cyan(kyy.user.username)
            );
            kyy.sendMessage(kyy.user.id, { text: "Bot is online!" });
        } else if (connection === "close") {
            console.log(
                colors.red("Connection closed, attempting to reconnect...")
            );
            if (
                lastDisconnect.error &&
                lastDisconnect.error.output.statusCode !== 401
            ) {
                connect();
            }
        }
    });

    kyy.ev.on("messages.upsert", async ({ messages }) => {
        const message = messages[0];
        if (!message.key.fromMe && message.message) {
            const userId = message.key.remoteJid;
            const userMessage =
                message.message.conversation ||
                message.message.extendedTextMessage.text;

            const chat = await getOrCreateChat(userId);
            const newMessage = {
                role: "user",
                content: userMessage,
                timestamp: new Date()
            };

            await updateChat(chat, newMessage);
            const response = await chatWithGPT(chat);

            const assistantMessage = {
                role: "assistant",
                content: response,
                timestamp: new Date()
            };

            await updateChat(chat, assistantMessage);
            await kyy.sendMessage(userId, { text: response });
        }
    });
};

connect().catch(console.error); // Handle connection errors

process.on("SIGTERM", async () => {
    await flushMessageBuffer();
    process.exit(0);
});
