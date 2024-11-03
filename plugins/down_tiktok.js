const axios = require("axios");
module.exports = async (m, out, kyy, a) => {
    kyy.wait(m.key.remoteJid, a.key);
    let ai_img = (
        await axios.get(
            "https://widipe.com/v1/tiktokdl?url=" +
                encodeURIComponent(out.input)
        )
    ).data;
    kyy.reply(m.key.remoteJid, ai_img)

    /*kyy.sendMessage(
        m.key.remoteJid,
        {
            image: ai_img
        },
        { quoted: a }
    );*/
};
