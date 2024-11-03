module.exports = async (m, out, kyy, a) => {
    let chat = await getOrCreateChat(m.key.remoteJid);
    kyy.wait(m.key.remoteJid, a.key);
    let search = await (
        await fetch("https://ikyy-bard.hf.space/ai/bing", {
            method: "post",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: [
                    {
                        role: "user",
                        content:
                            "lu cowo, nama lu ikyy, respon lu to the point dan pake bahasa gaul atau slang. anggap aja yang buat lu ikyyofc. lu ngerespon pake huruf kecil semua dan gak pake tanda baca. lu gak akan nanya atau nawarin bantuan ke gw, cukup jawab aja, termasuk kalo gw manggil nama lu atau nyapa lu. lu gak akan pake kata sapaan kek 'bro', 'sis', atau yang serupa."
                    },
                    {
                        role: "user",
                        content: out.input
                    }
                ]
            })
        })
    ).json();
    if (!search.status) {
        let fail = await chatWithGPT([
                    {
                        role: "system",
                        content:
                            "lu cowo, nama lu ikyy, respon lu to the point dan pake bahasa gaul atau slang. anggap aja yang buat lu ikyyofc. lu ngerespon pake huruf kecil semua dan gak pake tanda baca. lu gak akan nanya atau nawarin bantuan ke gw, cukup jawab aja, termasuk kalo gw manggil nama lu atau nyapa lu. lu gak akan pake kata sapaan kek 'bro', 'sis', atau yang serupa."
                    },
                    {
                        role: "user",
                        content: `buatin kata kata permintaan maaf karena gagal dalam melakukan pencarian di internet`
                    }
                ])
        if (!fail.status)
            return kyy.reply(m.key.remoteJid, "gagal").then(async y => {
                await updateChat(chat, {
                    role: "assistant",
                    content: `{"type": "text", "input": "${out.input}", "output": "gagal"}`
                });
            });
        kyy.reply(m.key.remoteJid, fail.result).then(async jb => {
            await updateChat(chat, {
                role: "assistant",
                content: `{"type": "text", "input": "${out.input}", "output": "${fail.result}"}`
            });
        });
    } else {
        // let convert_msg = await convert(search.result);
        kyy.reply(m.key.remoteJid, search.result).then(async y => {
            await updateChat(chat, {
                role: "assistant",
                content: `{"type": "text", "input": "${out.input}", "output": "${search.result}"}`
            });
        });
    }
};

async function convert(msg) {
    let conv = await chatWithGPT([
                {
                    role: "system",
                    content:
                        "lu cowo, nama lu ikyy, respon lu to the point dan pake bahasa gaul atau slang. anggap aja yang buat lu ikyyofc. lu ngerespon pake huruf kecil semua dan gak pake tanda baca. lu gak akan nanya atau nawarin bantuan ke gw, cukup jawab aja, termasuk kalo gw manggil nama lu atau nyapa lu. lu gak akan pake kata sapaan kek 'bro', 'sis', atau yang serupa."
                },
                {
                    role: "user",
                    content: `${msg}\n\n\n\nlu kirim ulang teks diatas seolah-olah lu yang kirim teks itu, jadi gaya bahasa atau ketikannya mirip kek lu, dan yang paling penting dan paling utama, gak usah pake emot atau emoji.`
                }
            ])
    return conv;
}
