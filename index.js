import { ActionRowBuilder, Client, GatewayIntentBits, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

import fetch from "node-fetch"
import fs from "fs"
import noblox from "noblox.js"
import { load } from "cheerio";
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
    
    switch (interaction.commandName) {
        case 'animation': {
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
            let buffer = Buffer.from(await res.arrayBuffer())
            try {
                let animIds = []
                await noblox.setCookie(cookie)
                const zip = new AdmZip(buffer)
                await Promise.all(zip.getEntries().map(async (zipEntry) => {
                    if (zipEntry.isDirectory || !zipEntry.name.endsWith('.rbxm')) return submit.editReply('Invalid file types in zip file')
                    let animId = await noblox.uploadAnimation(zipEntry.getData().toString(), {
                        name: zipEntry.name.slice(0, -5)
                    })
                    animIds.push(`${zipEntry.name.slice(0, -5)}: ${animId}`)
                }))
                submit.editReply(`Successfully created ${animIds.length} animations.\nAnimation IDs: \`\`\`${animIds.join(', ')}\`\`\``)
            } catch (err) {
                console.warn(err)
            }
            break
        }
        case 'gamepass': {
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
            submit.editReply(`Created ${amount} gamepasses with the name ${name} and price ${price}\nGamepass IDS:\`\`\`${ids.join(', ')}\`\`\``)
            break
        }
        case 'allow-audios': {
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
            let xsrf = await getToken(cookie)

            let groupId = interaction.options.getInteger('group', true)
            let universeId = interaction.options.getInteger('universe', true)

            let res = await (await fetch(`https://itemconfiguration.roblox.com/v1/creations/get-assets?assetType=Audio&isArchived=false&groupId=${groupId}&limit=100&cursor=`, {
                headers: {
                    Cookie: `.ROBLOSECURITY=${cookie}`
                }
            })).json()
            let audios = res.data.map((id) => id.assetId)
            let count = 0
            async function sendRequest(id) {
                let res = await fetch(`https://apis.roblox.com/asset-permissions-api/v1/assets/${id}/permissions`, {
                    method: 'PATCH',
                    headers: {
                        "x-csrf-token": xsrf,
                        Cookie: `.ROBLOSECURITY=${cookie}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        "requests": [
                            {"subjectType": "Universe", "subjectId": universeId, "action": "Use"}
                        ]
                    })
                })
                
                if(res.status !== 200) {
                    await wait(60 * 1000)
                    console.log("Ratelimited", ' | ', res.status, ' | ', res.statusText)
                    await sendRequest(id)
                }
            }
            await Promise.all(audios.map(async (id) => {
                await sendRequest(id)
                count += 1
            }))
            submit.editReply(`Updated ${count} audio permissions`)
            break
        }
        case 'devproducts': {
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
            let attachment = interaction.options.getAttachment('devproducts', true)
            let universeId = interaction.options.getInteger('universe', true)

            if (!attachment.name.endsWith('.json')) return submit.editReply(`Error: Invalid file type`)

            let res = await fetch(attachment.attachment)
            let buffer = Buffer.from(await res.arrayBuffer())
            let devProductsJSON = JSON.parse(buffer.toString())

            let devProducts = Object.entries(devProductsJSON)[0][1]
            await noblox.setCookie(cookie)
            let productIds = []
            await submit.editReply('Uploading assets, this may take a while due to api ratelimits')
            await Promise.all(devProducts.map(async (product) => {
                await (async function createDevProduct() {
                    try {
                        let id = await noblox.addDeveloperProduct(universeId, product.name, product.price, product.description ?? undefined)
                        productIds.push(`${id.name}: ${id.productId} | ${id.priceInRobux}`)
                    } catch (err) {
                        if(err === 'Error: Product with this name already exists') return await interaction.editReply(`Duplicate product name`)
                        console.log('Ratelimited, waiting one minute before trying again', ' | ', err)
                        await wait(60 * 1000)
                        await createDevProduct()
                    }
                })()
            }))
            submit.editReply(`Successfully created ${productIds.length} dev product(s)\nProducts:\`\`\`${productIds.join('; ')}\`\`\``).catch((reason) => {})
            break
        }
    }
})

client.login(process.env.TOKEN)
