import { ActionRowBuilder, Client, GatewayIntentBits, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

import fetch from "node-fetch"
import fs from "fs"
import noblox from "noblox.js"
import http from "http"
import AdmZip from "adm-zip";

const wait = (await import('timers/promises')).setTimeout

//Get token function NOT writen by me
const getToken = async (COOKIE) => {
    let xCsrfToken = "";

    const rbxRequest = async (verb, url, body) => {
        const response = await fetch(url, {
            headers: {
                Cookie: `.ROBLOSECURITY=${COOKIE};`,
                "x-csrf-token": xCsrfToken,
                "Content-Length": body?.length.toString() || "0",
            },
            method: "POST",
            body: body || "",
        });

        if (response.status == 403) {
            if (response.headers.has("x-csrf-token")) {
                xCsrfToken = response.headers.get("x-csrf-token");
                return rbxRequest(verb, url, body);
            }
        }

        return response;
    };

    const response = await rbxRequest("POST", "https://auth.roblox.com");

    return xCsrfToken
}

(await import('dotenv')).config()

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return
    if (interaction.commandName === 'gamepass') {
        let modal = new ModalBuilder()
            .setTitle('Coookie')
            .setCustomId('cookie-modal')
            .addComponents(
                new ActionRowBuilder()
                    .setComponents(new TextInputBuilder().setLabel('Cookie').setPlaceholder('The cookie you want to use for this interaction').setRequired(true).setStyle(TextInputStyle.Paragraph).setCustomId('cookie'))
            )
        interaction.showModal(modal)
        let submit = await interaction.awaitModalSubmit({ time: 10000 * 60 })
        await submit.deferReply()

        let universeId = interaction.options.getInteger('universe', true)
        let name = interaction.options.getString('name', true)
        let description = interaction.options.getString('description') ?? 'No description'
        let amount = interaction.options.getInteger('amount', true)
        let price = interaction.options.getInteger('price', true)
        let attachment

        if (interaction.options.getAttachment('image')) {
            attachment = new Blob([await (await fetch(interaction.options.getAttachment('image').url)).arrayBuffer()])
        } else {
            attachment = new Blob([fs.readFileSync('./placeholder.png')])
        }

        let cookie = submit.fields.getTextInputValue('cookie')
        let xsrf = await getToken(cookie)

        let ids = []

        for (let i = 0; i < amount; i++) {
            await wait(10 + i)
            const form = new FormData();
            form.append("Name", name);
            form.append("Description", description);
            form.append("UniverseId", universeId);
            form.append("File", attachment);

            const options = {
                method: 'POST',
                headers: {
                    Cookie: `.ROBLOSECURITY=${cookie}`,
                    'x-csrf-token': xsrf,
                }
            };

            options.body = form;

            let res = await fetch('https://apis.roblox.com/game-passes/v1/game-passes', options)

            if (res.status !== 200) { console.log(res.status, ' | ', res.statusText, ' | ', await res.json()); return submit.editReply(`Roblox is either down or you don't have permission to edit this experience`) }

            let gamepassId = (await res.json()).gamePassId
            ids.push(gamepassId)
            await fetch('https://www.roblox.com/game-pass/update', {
                method: "POST",
                body: JSON.stringify({
                    isForSale: true,
                    price,
                    id: gamepassId
                }),
                headers: {
                    Cookie: cookie,
                    'x-csrf-token': xsrf
                }
            })
        }
        submit.editReply(`Created ${amount} gamepasses with the name ${name} and price ${price}\nGamepass IDS:\`\`\`${ids.join(', ')}`)
    } else if (interaction.commandName === 'animation') {
        let modal = new ModalBuilder()
            .setTitle('Coookie')
            .setCustomId('cookie-modal')
            .addComponents(
                new ActionRowBuilder()
                    .setComponents(new TextInputBuilder().setLabel('Cookie').setPlaceholder('The cookie you want to use for this interaction').setRequired(true).setStyle(TextInputStyle.Paragraph).setCustomId('cookie'))
            )
        interaction.showModal(modal)
        let submit = await interaction.awaitModalSubmit({ time: 10000 * 60 })
        await submit.deferReply()

        let cookie = submit.fields.getTextInputValue('cookie')

        let zipAttachment = interaction.options.getAttachment('animations', true)
        if (!zipAttachment.name?.endsWith('.zip')) return submit.editReply(`You need to upload a zip file`)
        let res = await fetch(zipAttachment.attachment)
        res.body.pipe(fs.createWriteStream('./Download/animations.zip')).on('close', async () => {
            try {
                const zip = new AdmZip('./Download/animations.zip')
                for (const zipEntry of zip.getEntries()) {
                    if(zipEntry.isDirectory || !zipEntry.name.endsWith('.rbxm')) return submit.editReply('Invalid file types in zip file')
                }
                zip.extractAllToAsync('./Download')
            } catch (err) {
                console.warn(err)
            }
            await noblox.setCookie(cookie)
            fs.readdirSync(`./Downloads/${zip.name.slice(0, -4)}`).forEach(async(fileName) => {
                await noblox.uploadAnimation(fs.readFileSync(`./Downloads/${zip.name.slice(0, -4)}/${fileName}`), {
                    name: fileName.slice(0, -5)
                })
                fs.rmSync(`./Downloads/Animations/${fileName}`)
            })
        })
    }
})

client.login(process.env.TOKEN)
