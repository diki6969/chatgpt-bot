module.exports = async (m, out, kyy, a) => {
    kyy.wait(m.key.remoteJid, a.key);
    let res = await Api.widipe("download/tikdl", {
        url: out.input
    });
    kyy.sendMessage(
        m.key.remoteJid,
        {
            video: { url: res.result.video[0] }
        },
        { quoted: a }
    );
};
