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
        let req = await Api.widipe("feloai", { text: out.input });
        if (!req.status) return (search.status = false);

        search.result = req.result.answer;
    } catch (e) {
        search.status = false;
        console.error(e);
    }
    if (!search.status) {
        let fail = JSON.parse(await chatWithGPT([
            {
                role: "user",
                content: `buatin kata kata permintaan maaf karena gagal dalam melakukan pencarian di internet`
            }
        ], "buatin kata kata permintaan maaf karena gagal dalam melakukan pencarian di internet"));
        kyy.reply(m.key.remoteJid, fail.output).then(async jb => {
            await updateChat(chat, {
                role: "assistant",
                content: `{"type": "text", "input": "${out.input}", "output": "${fail.output}"}`
            });
        });
    } else {
        let convert_msg = JSON.parse(await convert(search.result));
        kyy.reply(m.key.remoteJid, convert_msg.output !== "" ? convert_msg.output : convert_msg.input).then(async y => {
            await updateChat(chat, {
                role: "assistant",
                content: `{"type": "text", "input": "${out.input}", "output": "${convert_msg.output !== "" ? convert_msg.output : convert_msg.input}"}`
            });
        });
    }
};

async function convert(msg) {
    let conv = await chatWithGPT([
        {
            role: "user",
            content: `${msg}\n\n\n\nlu jelasin ulang teks diatas, biar mudah dipahami versi lu yang ngejelasin.`
        }
    ], `${msg}\n\n\n\nlu jelasin ulang teks diatas, biar mudah dipahami versi lu yang ngejelasin.`);
    return conv;
}