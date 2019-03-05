require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {

});

client.on('message', message => {
    if (message.content === 'kickstarter-test') {
        message.channel.send(`received kicstarter-test on ${message.channel.name}`);
    }
});

client.login(process.env.BOT_TOKEN);
