require("./config");
const {
    default: makeWaSocket,
    useMultiFileAuthState,
    PHONENUMBER_MCC
} = require("@whiskeysockets/baileys");
const ai = require("unlimited-ai");
const axios = require("axios");
const Pino = require("pino");
const fs = require("fs").promises;
const colors = require("@colors/colors/safe");
const {
    connectDB,
    getOrCreateChat,
    updateChat,
    updateAllChatsSystemMessages
} = require("./database");
const { jsonFormat, simpleBind } = require("./lib/simple");

class ApiFeature {
    constructor() {
        this.baseUrls = {
            Nazuna: "https://api.nazuna.my.id/api/",
            Widipe: "https://widipe.com/",
            Itzpire: "https://itzpire.com/"
        };
    }

    async makeRequest(baseUrl, endpoint, options = {}) {
        const { data, ...params } = options;
        const method = data ? "POST" : "GET";
        const config = {
            baseURL: baseUrl,
            url: endpoint,
            method,
            headers: { accept: "*/*" },
            ...(method === "GET" ? { params } : { data })
        };

        try {
            const response = await axios(config);
            return response.data;
        } catch (error) {
            return error.response?.data || error;
        }
    }

    nazuna = (endpoint, options) =>
        this.makeRequest(this.baseUrls.Nazuna, endpoint, options);
    widipe = (endpoint, options) =>
        this.makeRequest(this.baseUrls.Widipe, endpoint, options);
    itzpire = (endpoint, options) =>
        this.makeRequest(this.baseUrls.Itzpire, endpoint, options);
}

const Api = new ApiFeature();

async function chatWithGPT(data_msg) {
    try {
        const model = "gemini-1.5-pro-exp-0827";
        const res = await ai.generate(model, data_msg);
        return jsonFormat(res);
    } catch (e) {
        console.error("Error in chatWithGPT:", e);
        return await chatWithGPT(data_msg);
    }
}

async function connect() {
    await connectDB();
    await updateAllChatsSystemMessages();
    console.log(colors.green("Connecting..."));

    const { state, saveCreds } = await useMultiFileAuthState("session");
    const config = JSON.parse(await fs.readFile("./pairing.json", "utf-8"));

    const kyy = makeWaSocket({
        printQRInTerminal: !(config.pairing?.state && config.pairing?.number),
        auth: state,
        browser: ["Chrome (Linux)", "", ""],
        logger: Pino({ level: "silent" })
    });

    simpleBind(kyy);

    if (config.pairing?.state && !kyy.authState.creds.registered) {
        const phoneNumber = config.pairing.number;
        if (
            !Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))
        ) {
            console.log(colors.red("Invalid phone number"));
            return;
        }
        setTimeout(async () => {
            try {
                let code = await kyy.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(colors.yellow("Pairing Code: " + code));
            } catch (error) {
                console.error("Error requesting pairing code:", error);
            }
        }, 3000);
    }

    kyy.ev.on("creds.update", saveCreds);

    kyy.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        if (connection === "open") {
            console.log(
                colors.green("Successfully Connected With ") +
                    colors.cyan(kyy.user.name)
            );
        } else if (connection === "close") {
            if (
                lastDisconnect?.output?.statusCode !==
                DisconnectReason.loggedOut
            ) {
                connect();
            }
        }
    });

    kyy.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        const text =
            m.message?.extendedTextMessage?.text ||
            m.message?.ephemeralMessage?.message?.extendedTextMessage?.text ||
            m.message?.conversation ||
            "";

        if (m.key.remoteJid.endsWith("@g.us")) {
            setTimeout(() => kyy.groupLeave(m.key.remoteJid), 5000);
            return;
        }

        if (!m.key.fromMe && !m.key.remoteJid.endsWith("@g.us")) {
            kyy.readMessages([m.key]).then(() => {
                getOrCreateChat(m.key.remoteJid).then(chat => {
                    updateChat(chat, {
                        role: "user",
                        content: text
                    }).then(() => {
                        kyy.sendPresenceUpdate(
                            "composing",
                            m.key.remoteJid
                        ).then(() => {
                            chatWithGPT(chat.conversations).then(
                                response => {
                                    kyy.reply(
                                        m.key.remoteJid,
                                        jsonFormat(response),
                                        m
                                    ).then(a => {
                                        updateChat(chat, {
                                            role: "assistant",
                                            content: response
                                        });
                                    });
                                }
                            );
                        });
                    });
                });
            });
        }
    });
}

connect().catch(error => {
    console.error("Connection error:", error);
    connect();
});
