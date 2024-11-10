const yt = require("../lib/yt");
const YT = new yt();
module.exports = async (m, out, kyy, a) => {
    kyy.wait(m.key.remoteJid, a.key);
    let search = await yts(out.input);
    let f = search.all.filter(v => !v.url.includes("@"));
    let anu = f[0];
    const res = await YT.getResult(anu.url, "mp3");
    if (!res.status) {
        let chat = await getOrCreateChat(m.key.remoteJid);
        await updateChat(chat, {
            role: "assistant",
            content: `{"type": "text", "input": "${out.input}", "output": "maaf gw gagal buat ngirim lagu yang lu mau, karena servernya bermasalah"}`
        });
        return kyy.reply(
            m.key.remoteJid,
            "maaf gw gagal buat ngirim lagu yang lu mau, karena servernya bermasalah"
        );
    }
    
    
    await kyy.sendAudio(
        m.key.remoteJid,
        {
            audio: { url: res.data.media.url },
            mimetype: "audio/mpeg",
            fileName: `${res.data.title}.mp3`
        },
        a,
        res.data.title,
        res.data.thumbnail,
        anu.url
    );
};
