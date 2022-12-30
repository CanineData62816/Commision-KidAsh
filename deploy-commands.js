(await import('dotenv')).config()
let clientId = process.env.CLIENT_ID
let token = process.env.TOKEN

import { Routes, REST, SlashCommandBuilder } from 'discord.js'

const rest = new REST({ version: 10 }).setToken(token)

let commands = [
    new SlashCommandBuilder()
        .setName('gamepass')
        .setDescription('Creates gamepasses')
        .addStringOption(option => option.setName('name').setDescription('description').setRequired(true))
        .addIntegerOption(option => option.setName('universe').setDescription('description').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('description').setRequired(true))
        .addIntegerOption(option => option.setName('price').setDescription('description').setRequired(true))
        .addStringOption(option => option.setName('description').setDescription('description'))
        .addAttachmentOption(option => option.setName('image').setDescription('The image for the gamepass'))
        .toJSON(),
]

rest.put(Routes.applicationCommands(clientId), {
    body: commands
})