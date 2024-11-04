const axios = require("axios");
module.exports = async (m, out, kyy, a) => {
    kyy.wait(m.key.remoteJid, a.key);
    let res = await Api.widipe("download/tiktokdl", {url: out.input})
    kyy.reply(m.key.remoteJid, res)

    /*kyy.sendMessage(
        m.key.remoteJid,
        {
            image: ai_img
        },
        { quoted: a }
    );*/
};
