const axios = require("axios");
const yts = require("yt-search");

module.exports = async (m, out, kyy, a) => {
    kyy.wait(m.key.remoteJid, a.key);
    let search = await yts(out.input);
    let f = search.all.filter(v => !v.url.includes("@"));
    let anu = f[0];
    const options = {
        method: "GET",
        url: "https://y2ts.us.kg/token",
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
            Referer: "https://y2ts.us.kg/"
        },
        compress: true // Ini untuk --compressed
    };

    const token = (await axios(options)).data.token;
    const res = (
        await axios({
            method: "get",
            url: "https://y2ts.us.kg/youtube?url=" + anu.url,
            headers: {
                "Authorization-Token": token,
                "User-Agent":
                    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
                Referer: "https://y2ts.us.kg/"
            },
            decompress: true // This corresponds to the --compressed flag in curl
        })
    ).data;
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
            audio: { url: res.result.mp3 },
            mimetype: "audio/mpeg",
            fileName: `${res.result.title}.mp3`
        },
        a,
        res.result.title,
        res.result.thumbnail,
        res.result.url
    );
};
