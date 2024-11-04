const axios = require("axios");
module.exports = async (m, out, kyy, a) => {
    kyy.wait(m.key.remoteJid, a.key);
    let res = await Api.widipe("download/tiktokdl", { url: out.input });
    kyy.sendMessage(
        m.key.remoteJid,
        {
            video: {
                url: res.result.video
            }
        },
        { quoted: a }
    );
};
