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
    new SlashCommandBuilder()
        .setName('animation')
        .setDescription('Bulk create animations')
        .addAttachmentOption(option => option.setName('animations').setDescription('description').setRequired(true))
        .toJSON(),
    new SlashCommandBuilder()
        .setName('devproducts')
        .setDescription('Create dev products based off a json file')
        .addIntegerOption(option => option.setName('universe').setDescription('The universe to create the dev product for').setRequired(true))
        .addAttachmentOption(option => option.setName('devproducts').setDescription('The file with the dev products to create').setRequired(true))
        .toJSON(),
    new SlashCommandBuilder()
        .setName('allow-audios')
        .setDescription('Add a universe to the allow list of every audio in a group')
        .addIntegerOption(option => option.setName('group').setDescription('The group').setRequired(true))
        .addIntegerOption(option => option.setName('universe').setDescription('The universe').setRequired(true))
]

rest.put(Routes.applicationCommands(clientId), {
    body: commands
})