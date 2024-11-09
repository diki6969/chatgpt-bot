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
        await Morphic.login(process.env.morphic_user, process.env.morphic_pw);
        let res = await Morphic.chat(out.input);

        search.result = res.answer;
    } catch (e) {
        search.status = false;
        console.error(e);
    }
    if (!search.status) {
        let fail = await GptFailSearch();
        kyy.reply(m.key.remoteJid, fail).then(async jb => {
            await updateChat(chat, {
                role: "assistant",
                content: `{"type": "text", "input": "${out.input}", "output": "${fail}"}`
            });
        });
    } else {
        let convert_msg = await GptConvert(search.result);
        kyy.reply(m.key.remoteJid, convert_msg).then(async y => {
            await updateChat(chat, {
                role: "assistant",
                content: `{"type": "text", "input": "${out.input}", "output": "${convert_msg}"}`
            });
        });
    }
};
