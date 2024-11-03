const axios = require("axios");
module.exports = async (m, out, kyy, a) => {
    kyy.wait(m.key.remoteJid, a.key);
    const response = await Api.widipe("download/tiktokdl", {url: out.input})
    let content = response.data
    kyy.reply(m.key.remoteJid, `${out.input}\n\n${response}\n\n${content}`);
    /* if (content?.images) {
        for (let x of content.images) {
            setTimeout(async () => {
                await kyy.sendMessage(m.key.remoteJid, {
                    image: {
                        url: x
                    }
                }, {quoted: a});
            }, 2500);
        }
    } else {
        await kyy.sendMessage(m.key.remoteJid, {
            video: {
                url: content.play
            }
        }, {quoted: a});
    }*/
};
