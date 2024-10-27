const baileys = require("@whiskeysockets/baileys");
const axios = require("axios");
const yts = require("yt-search");
const {
    default: makeWaSocket,
    useMultiFileAuthState,
    PHONENUMBER_MCC
} = baileys;
const Pino = require("pino"),
    fs = require("fs"),
    path = require("path"),
    colors = require("@colors/colors/safe");

const { connectDB, getOrCreateChat, updateChat } = require("./database");

class Api_feature {
    constructor() {
        this.Nazuna = "https://api.nazuna.my.id/api/";
        this.Widipe = "https://widipe.com/";
        this.Itspire = "https://itzpire.com/";
        //this.apiKey = process.env.API_KEYS;
    }

    nazuna = (endpoint, options = {}) => {
        const { data, ...params } = options;
        const method = data ? "POST" : "GET";

        const config = {
            baseURL: this.Nazuna,
            url: endpoint,
            method: method,
            headers: {
                //Authorization: this.apiKey,
                accept: "*/*"
            },
            ...(method === "GET" && { params: params }),
            ...(method === "POST" && { data: data })
        };

        return new Promise((resolve, reject) => {
            axios
                .request(config)
                .then(response => {
                    resolve(response.data);
                })
                .catch(e => {
                    if (e.response) {
                        resolve(e.response.data);
                    } else {
                        resolve(e);
                    }
                });
        });
    };
    widipe = (endpoint, options = {}) => {
        const { data, ...params } = options;
        const method = data ? "POST" : "GET";

        const config = {
            baseURL: this.Widipe,
            url: endpoint,
            method: method,
            headers: {
                //Authorization: this.apiKey,
                accept: "*/*"
            },
            ...(method === "GET" && { params: params }),
            ...(method === "POST" && { data: data })
        };

        return new Promise((resolve, reject) => {
            axios
                .request(config)
                .then(response => {
                    resolve(response.data);
                })
                .catch(e => {
                    if (e.response) {
                        resolve(e.response.data);
                    } else {
                        resolve(e);
                    }
                });
        });
    };
    itspire = (endpoint, options = {}) => {
        const { data, ...params } = options;
        const method = data ? "POST" : "GET";

        const config = {
            baseURL: this.Itspire,
            url: endpoint,
            method: method,
            headers: {
                //Authorization: this.apiKey,
                accept: "*/*"
            },
            ...(method === "GET" && { params: params }),
            ...(method === "POST" && { data: data })
        };

        return new Promise((resolve, reject) => {
            axios
                .request(config)
                .then(response => {
                    resolve(response.data);
                })
                .catch(e => {
                    if (e.response) {
                        resolve(e.response.data);
                    } else {
                        resolve(e);
                    }
                });
        });
    };
}

global.Api = new Api_feature();
async function chatWithGPT(data_msg) {
    try {
        const bot = await Api.widipe("post/gpt-prompt", {
            data: { messages: data_msg }
        });
        // ngembaliin respons dari bot
        return jsonFormat(bot.result);
    } catch (e) {
        return jsonFormat(e);
    }
}

const plugins = {};

function loadPlugins() {
    const pluginDir = path.join(__dirname, "plugins");
    fs.readdirSync(pluginDir).forEach(file => {
        if (file.endsWith(".js")) {
            const pluginName = path.basename(file, ".js");
            plugins[pluginName] = require(path.join(pluginDir, file));
            console.log(`Plugin ${pluginName} telah dimuat.`);
        }
    });
}

loadPlugins();
const connect = async () => {
    await connectDB();
    console.log(colors.green("Connecting..."));
    const { state, saveCreds } = await useMultiFileAuthState("session");
    const config = JSON.parse(fs.readFileSync("./pairing.json", "utf-8"));

    const kyy = makeWaSocket({
        printQRInTerminal:
            config.pairing && config.pairing.state && config.pairing.number
                ? false
                : true,
        auth: state,
        browser: ["Chrome (Linux)", "", ""],
        logger: Pino({ level: "silent" })
    });
    if (
        config.pairing &&
        config.pairing.state &&
        !kyy.authState.creds.registered
    ) {
        var phoneNumber = config.pairing.number;
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
            } catch {}
        }, 3000);
    }
    kyy.ev.on("creds.update", saveCreds);
    kyy.ev.on("connection.update", async update => {
        //console.log(update);
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
            console.log(
                colors.green("Succesfully Connected With ") +
                    colors.cyan(kyy.user.name)
            );
        }
        if (connection === "close") {
            if (
                lastDisconnect?.output?.statusCode !==
                baileys.DisconnectReason.loggedOut
            )
                connect();
        }
    });
    kyy.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        const pesan =
            (
                m.message?.extendedTextMessage?.text ??
                m.message?.ephemeralMessage?.message?.extendedTextMessage
                    ?.text ??
                m.message?.conversation
            )?.toLowerCase() || "";
        kyy.reply = (jid, text) =>
            kyy.sendMessage(jid, { text: text }, { quoted: m });
        kyy.wait = (jid, keys) => {
            kyy.sendMessage(jid, { react: { text: "⌛", key: keys } });
        };
        kyy.sendAudio = async (
            jid,
            audioinfo = {},
            m,
            title,
            thumbnailUrl,
            sourceUrl,
            body = "",
            LargerThumbnail = true,
            AdAttribution = true
        ) => {
            return await kyy.sendMessage(
                jid,
                {
                    ...audioinfo,
                    contextInfo: {
                        externalAdReply: {
                            title: title,
                            body: body,
                            thumbnailUrl: thumbnailUrl,
                            sourceUrl: sourceUrl,
                            mediaType: 1,
                            showAdAttribution: AdAttribution,
                            renderLargerThumbnail: LargerThumbnail
                        }
                    }
                },
                { quoted: m }
            );
        };
        //console.log(pesan)
        if (m.key.remoteJid.endsWith("@g.us")) {
            setTimeout(() => {
                kyy.groupLeave(m.key.remoteJid);
            }, 5000);
        }
        if (pesan && !m.key.fromMe && !m.key.remoteJid.endsWith("@g.us")) {
            kyy.readMessages([m.key]);
            const chat = await getOrCreateChat(m.key.remoteJid);
            await updateChat(chat, {
                role: "user",
                content: pesan
            });
            kyy.sendPresenceUpdate("composing", m.key.remoteJid);
            const response = await chatWithGPT(chat.conversations);
            let out;
            if (response === "undefined") {
                return;
            } else if (typeof response === "undefined") {
                return;
            } else if (response === undefined) {
                return;
            } else {
                out = JSON.parse(response);
            }
            kyy.reply(m.key.remoteJid, out.output, m).then(async a => {
                await updateChat(chat, {
                    role: "assistant",
                    content: response
                });
                if (plugins[out.type]) {
                    await plugins[out.type](m, out, kyy, a);
                }
            });
        }
    });
};

module.exports = { connect };

const jsonFormat = obj => {
    try {
        let print =
            obj &&
            (obj.constructor.name == "Object" ||
                obj.constructor.name == "Array")
                ? require("util").format(JSON.stringify(obj, null, 2))
                : require("util").format(obj);
        return print;
    } catch {
        return require("util").format(obj);
    }
};
//connect().catch(() => connect())
