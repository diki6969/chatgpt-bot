const axios = require("axios");
const yts = require("yt-search");

module.exports = async (m, out, kyy, a) => {
    kyy.wait(m.key.remoteJid, a.key);
    let search = await yts(out.input);
    let f = search.all.filter(v => !v.url.includes("@"));
    let res = await Api.widipe("download/ytdl", {
        url: f[0].url
    });
    if (!res.status) return;
    let anu = res.result;
    await kyy.sendAudio(
        m.key.remoteJid,
        {
            audio: { url: anu.mp3 },
            mimetype: "audio/mpeg",
            fileName: `${anu.title}.mp3`
        },
        a,
        anu.title,
        anu.thumbnail,
        f[0].url
    );
};
