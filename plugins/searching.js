let morphic = require("../lib/ai");
const Morphic = new morphic();
module.exports = async (m, out, kyy, a) => {
    let chat = await getOrCreateChat(m.key.remoteJid);
    kyy.wait(m.key.remoteJid, a.key);
    let search = {
        status: true,
        result: ""
    };
    try {
        // https://api.yanzbotz.live/api/ai/ai-search?query=kamu%20siapa&apiKey=yanzdev
        let req = await Api.yanzbotz("ai/ai-search", { query: out.input });
        if (req.status !== 200) return (search.status = false);

        search.result = req.result.answer;
    } catch (e) {
        search.status = false;
        console.error(e);
    }
    if (!search.status) {
        let fail = await chatWithGPT([
          ...chat.conversations,
            {
                role: "user",
                content: `kamu harus minta maaf karena gagal buat searching ${out.input} di internet`
            }
        ]);
        kyy.reply(m.key.remoteJid, fail.output).then(async jb => {
            await updateChat(chat, {
                role: "assistant",
                content: `{"type": "text", "input": "${out.input}", "output": "${fail.output}"}`
            });
        });
    } else {
        let convert_msg = await convert(search.result);
        kyy.reply(m.key.remoteJid, convert_msg).then(async y => {
            await updateChat(chat, {
                role: "assistant",
                content: `{"type": "text", "input": "${out.input}", "output": "${convert_msg}"}`
            });
        });
    }
};

async function convert(msg) {
    let conv = await chatWithGPT([
      ...chat.conversations,
        {
            role: "user",
            content: `gw udah dapet informasinya dibawah \n\n\n${msg}\n\n\n\nlu kirim ulang teks diatas seolah-olah lu yang kirim teks itu, jadi gaya bahasa atau ketikannya mirip kek lu, dan yang paling penting dan paling utama, gak usah pake emot atau emoji.`
        }
    ]);
    return conv.output;
}
