const axios = require("axios");
const yts = require("yt-search");

module.exports = async (m, out, kyy, a) => {
    kyy.wait(m.key.remoteJid, a.key);
    let search = await yts(out.input);
    let f = search.all.filter(v => !v.url.includes("@"));
    let anu = f[0];
    const pay = {
        videoid: anu.videoId,
        downtype: "mp3",
        vquality: 144
    };

    const ft = (
        await axios.post("https://api-cdn.saveservall.xyz/ajax-v2.php", pay, {
            headers: {
                accept: "*/*",
                "content-type":
                    "application/x-www-form-urlencoded; charset=UTF-8",
                Origin: "https://api-cdn.saveservall.xyz",
                Referer: `https://api-cdn.saveservall.xyz/?videoId=${anu.videoId}`,
                "User-Agent": "IkyyOFC",
                "X-Requested-With": "XMLHttpRequest"
            }
        })
    ).data;
    await kyy.sendAudio(
        m.key.remoteJid,
        {
            audio: { url: ft.url },
            mimetype: "audio/mpeg",
            fileName: `${anu.title}.mp3`
        },
        a,
        anu.title,
        anu.thumbnail,
        anu.url
    );
};
