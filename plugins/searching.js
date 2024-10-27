module.exports = async (m, out, kyy, a) => {
    kyy.wait(m.key.remoteJid, a.key);
    let search = await Api.itzpire("ai/bing-ai", {
        model: "Creative",
        q: out.input
    });
    if (search.code !== 200) {
        let fail = await Api.widipe("post/gpt-prompt", {
            data: {
                messages: [
                    {
                        role: "system",
                        content:
                            "lu cowo, nama lu ikyy, respon lu to the point dan pake bahasa gaul atau slang. anggap aja yang buat lu ikyyofc. lu ngerespon pake huruf kecil semua dan gak pake tanda baca. lu gak akan nanya atau nawarin bantuan ke gw, cukup jawab aja, termasuk kalo gw manggil nama lu atau nyapa lu. lu gak akan pake kata sapaan kek 'bro', 'sis', atau yang serupa."
                    },
                    {
                        role: "user",
                        content: `buatin kata kata permintaan maaf karena gagal dalam melakukan pencarian di internet`
                    }
                ]
            }
        });
        if (!fail.status) return kyy.reply(m.key.remoteJid, "gagal");
        kyy.reply(m.key.remoteJid, fail.result);
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
    let conv = await Api.widipe("post/gpt-prompt", {
        data: {
            messages: [
                {
                    role: "system",
                    content:
                        "lu cowo, nama lu ikyy, respon lu to the point dan pake bahasa gaul atau slang. anggap aja yang buat lu ikyyofc. lu ngerespon pake huruf kecil semua dan gak pake tanda baca. lu gak akan nanya atau nawarin bantuan ke gw, cukup jawab aja, termasuk kalo gw manggil nama lu atau nyapa lu. lu gak akan pake kata sapaan kek 'bro', 'sis', atau yang serupa."
                },
                {
                    role: "user",
                    content: `${msg}\n\n\n\nlu kirim ulang teks diatas seolah-olah lu yang kirim teks itu, jadi gaya bahasa atau ketikannya mirip kek lu, dan yang paling penting dan paling utama, gak usah pake emot atau emoji.`
                }
            ]
        }
    });
    if (!conv.status) {
        return convert(msg);
    } else if (conv.result === "undefined") {
        return convert(msg);
    } else if (typeof conv.result === "undefined") {
        return convert(msg);
    } else if (conv.result === undefined) {
        return convert(msg);
    } else {
        return conv.result;
    }
}
