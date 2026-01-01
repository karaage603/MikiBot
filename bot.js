// Project dependencies
require('dotenv').config();
const { Client, Events, IntentsBitField, Partials } = require('discord.js');
const constants = require('./config/constants.js');
const { handleCommand } = require('./commands.js');
const { urlReplacement } = require('./services/urlReplacement.js');
const {
  reactToPostedLinks,
  deleteReactMonitoring,
  convertFxTwitterToEnglish,
  spoilerReactHandler
} = require('./services/postReact.js');
const { youtubeBlacklistMain } = require('./services/youtubeBlacklist.js');
const { checkMines } = require('./services/mines.js');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Config
const token = process.env.BOT_TOKEN;
const botOwnID = constants.BOT_OWN_ID;
const listOfSites = constants.SITE_LIST;
const reactionTimeout = constants.REACTION_TIMEOUT;

client.on('error', (error) => {
  console.error('Bot encountered an error:', error);
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (!message || !message.content) return;

  // Delete the scum of the face of the planet
  if (message.content.includes('/lunlun67.gif')) {
    await message.delete();
    return;
  }

  try {
    await checkMines(message);
    await urlReplacement(message);
  await youtubeBlacklistMain(message);

    if (message.content.startsWith(constants.COMMAND_PREFIX)) {
      await handleCommand(client, message);
    }
  } catch (err) {
    console.error('Error handling messageCreate:', err);
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  try {
  await deleteReactMonitoring(reaction, user, botOwnID, listOfSites, reactionTimeout);
  await spoilerReactHandler(reaction, user, listOfSites);
  await convertFxTwitterToEnglish(reaction, user);
  } catch (err) {
    console.error('Error handling reaction:', err);
  }
});

client.login(token);
