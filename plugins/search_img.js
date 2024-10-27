module.exports = async (m, out, kyy, a) => {
    kyy.wait(m.key.remoteJid, a.key);
    let img = await Api.widipe("googleimage", {
        query: out.input
    });
    kyy.sendMessage(
        m.key.remoteJid,
        {
            image: { url: img.result[0] }
        },
        { quoted: a }
    );
};
