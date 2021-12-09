import dotenv from 'dotenv';
dotenv.config();
import { Client, Intents } from 'discord.js';
import pg from 'pg';
import fetch from 'node-fetch';
import { Server as httpServer } from 'http';

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

const pgClient = new pg.Client();

const PREFIX = '!ksbot';
const SETTINGS_TABLE = 'settings';

const sendSelfDestructingErrorMessage = async (message) => {
  const errMsg = await message.channel.send(
    'There was an issue retrieving the campaig link...this message will self-destruct in 10 seconds'
  );
  setTimeout(() => {
    errMsg.delete();
  }, 10000);
};

client.on('ready', async () => {
  try {
    await pgClient.connect();
    const tableExists = await pgClient.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_catalog = '${pgClient.database}' AND table_name = '${SETTINGS_TABLE}')`
    );
    if (!tableExists.rows[0].exists) {
      await pgClient.query(
        `CREATE TABLE ${SETTINGS_TABLE} (id SERIAL PRIMARY KEY, guild_id varchar(128), name varchar(255), value text, set_at timestamp DEFAULT current_timestamp)`
      );
    }
  } catch (err) {
    throw err;
  }
});

client.on('messageCreate', async (message) => {
  try {
    const command = `${PREFIX} set-campaign`;
    if (message.content.startsWith(command)) {
      if (message.member.id === message.guild.ownerId) {
        const info = message.content.replace(command, '').trim().split(' ');
        if (info.length === 2) {
          try {
            await pgClient.query(
              'INSERT INTO settings(guild_id, name, value) VALUES($1, $2, $3) RETURNING *',
              [message.guild.id, 'creator', info[0]]
            );
            await pgClient.query(
              'INSERT INTO settings(guild_id, name, value) VALUES($1, $2, $3) RETURNING *',
              [message.guild.id, 'campaign', info[1]]
            );
            message.channel.send(
              `Now tracking ${info[0]}'s ${info[1]} kickstarter. Check it out at https://www.kickstarter.com/projects/${info[0]}/${info[1]}/description`
            );
          } catch (err) {
            message.channel.send(
              'Uh-oh, that was an error setting the campaign to follow!'
            );
          }
        } else {
          message.channel.send(
            'The command signature is `!ksbot set-campaign [creator-slug] [campaign-slug]` e.g. !ksbot set-campaign criticalrole critical-role-the-legend-of-vox-machina-animated-s'
          );
        }
      } else {
        message.channel.send('Only the server owner can use this command');
      }
    }
  } catch (exc) {
    sendSelfDestructingErrorMessage(message);
    console.error(exc);
  }
});

client.on('messageCreate', async (message) => {
  const command = `${PREFIX} status`;
  if (message.content.startsWith(command)) {
    try {
      const info = message.content
        .replace(command, '')
        .trim()
        .split(' ')
        .filter(Boolean);
      let creator;
      let campaign;
      if (info.length === 0) {
        // look up the defaults
        creator = (
          await pgClient.query(
            'SELECT * FROM settings WHERE guild_id=$1 AND name=$2 LIMIT 1',
            [message.guild.id, 'creator']
          )
        ).rows[0].value;
        campaign = (
          await pgClient.query(
            'SELECT * FROM settings WHERE guild_id=$1 AND name=$2 LIMIT 1',
            [message.guild.id, 'campaign']
          )
        ).rows[0].value;
      } else if (info.length === 2) {
        creator = info[0];
        campaign = info[1];
      }
      const response = await fetch(
        `https://www.kickstarter.com/projects/${creator}/${campaign}/stats.json`
      );
      const stats = await response.json();
      message.channel.send(
        `The campaign currently has ${stats.project.backers_count} backers with a total donation amount of $${stats.project.pledged}. View more info at https://www.kickstarter.com/projects/${creator}/${campaign}/description.`
      );
    } catch (err) {
      sendSelfDestructingErrorMessage(message);
      console.error(err);
    }
  }
});

client.on('messageCreate', async (message) => {
  try {
    const command = `${PREFIX} link`;
    if (message.content.startsWith(command)) {
      const creatorResp = await pgClient.query(
        'SELECT * FROM settings WHERE guild_id=$1 AND name=$2 LIMIT 1',
        [message.guild.id, 'creator']
      );
      const creator = creatorResp.rows[0].value;
      const campaignResp = await pgClient.query(
        'SELECT * FROM settings WHERE guild_id=$1 AND name=$2 LIMIT 1',
        [message.guild.id, 'campaign']
      );
      const campaign = campaignResp.rows[0].value;
      const link = `https://www.kickstarter.com/projects/${creator}/${campaign}/description`;
      message.channel.send(`The currently tracked campaign is ${link}`);
    }
  } catch (exc) {
    sendSelfDestructingErrorMessage(message);
    console.error(exc);
  }
});

client.login(process.env.BOT_TOKEN);

const heartbeat = new httpServer((req, res) => {
  res.end('KS Bot Lives');
});

heartbeat.listen(20080);
