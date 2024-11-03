const axios = require("axios");
module.exports = async (m, out, kyy, a) => {
    kyy.wait(m.key.remoteJid, a.key);
    const response = await (
        await fetch("https://tikwm.com/api/", {
            method: "POST",
            body: `url=${encodeURIComponent(out.input)}`,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded" // Set appropriate header
            }
        })
    ).json();
    let data = JSON.parse(response);
    let content = data.data
    kyy.reply(m.key.remoteJid, `${out.input}\n\n${data}\n\n${content}`);
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
