const axios = require("axios");
module.exports = async (m, out, kyy, a) => {
    kyy.wait(m.key.remoteJid, a.key);
    // https://api.yanzbotz.live/api/text2img/realistic?prompt=&apiKey=yanzdev
    let ai_img = (
        await axios.get(
            Api.Yanzbotz + "text2img/realistic?prompt=" + encodeURIComponent(out.input) + "&apiKey=yanzdev",
            { responseType: "arraybuffer" }
        )
    ).data;
    kyy.sendMessage(
        m.key.remoteJid,
        {
            image: ai_img
        },
        { quoted: a }
    );
};
