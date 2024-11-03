const axios = require("axios");
const createSlideArray = anu => {
    let slides;
    let url;
    if (anu.images && anu.images.length > 0) {
        slides = anu.images;
    } else {
        url = anu.play;
    }
    return url ? [url, false] : slides;
};
module.exports = async (m, out, kyy, a) => {
    let response = await axios.post(
        "https://tikwm.com/api/",
        `url=${encodeURIComponent(out.input)}`
    );
    let data = response.data;
    let content = data.data;
    let slideArray = createSlideArray(content);

    if (slideArray[1] !== false) {
        for (let x of slideArray) {
            setTimeout(async () => {
                await kyy.sendMessage(m.key.remoteJid, {
                    image: {
                        url: x
                    }
                });
            }, 2500);
        }
    } else {
        await kyy.sendMessage(m.key.remoteJid, {
            video: {
                url: slideArray[0]
            }
        });
    }
};
