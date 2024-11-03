const axios = require("axios");
module.exports = async (m, out, kyy, a) => {
    kyy.wait(m.key.remoteJid, a.key);
    let response = await axios.post(
        "https://tikwm.com/api/",
        `url=${encodeURIComponent(out.input)}`
    );
    let data = response.data;
    let content = data.data;
    kyy.reply(m.key.remoteJid, content)
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
