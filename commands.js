const {
  botHasPermission,
  returnFile,
  uploadCommand,
  renameCommand,
  deleteCommand,
  listMedia,
  hasPermission
} = require('./filemanager');

const {
  placeMines,
  removeMines,
  hitCountRanking
} = require('./services/mines');

const {
  convertMiles,
  convertKM,
  convertFeet,
  convertMeters,
  convertCelsius,
  convertFahrenheit
} = require('./services/conversions');

const { EmbedBuilder } = require('discord.js');
const { COMMAND_PREFIX } = require('./config/constants');
const { newBlacklistChannel } = require('./services/youtubeBlacklist.js');

function getHelpEmbed() {
  return new EmbedBuilder()
    .setTitle('Help Menu')
    .setDescription('Here’s a list of things I can do:')
    .addFields(
      {
        name: 'General Commands',
        value: [
          '`.help` — Show this help menu',
          '`.list` — List available media',
          '`.[media name]` — Posts media',
          '`.countmines` — Check mines leaderboard'
        ].join('\n')
      },
      {
        name: 'Reactions',
        value: [
          '`Translate an fxtwitter post to English` — React with 🌍, 🇺🇸, 🇬🇧, 🇨🇦, 🇦🇺,🇳🇿',
          '`Spoiler a link` — React with 👁️',
          '`Delete a link` — React with ❌'
        ].join('\n')
      },
      {
        name: 'Conversions',
        value: [
          '**Temperature:**',
          '`.convertF [F]` — Fahrenheit to Celsius',
          '`.convertC [C]` — Celsius to Fahrenheit',
          '**Length/Distance:**',
          '`.convertMiles [mi]` — Miles to kilometers',
          '`.convertKM [km]` — Kilometers to miles',
          '`.convertMeters [m]` — Meters to feet/inches',
          '`.convertFeet [ft]` — Feet/inches to meters (use `5\'9` format)'
        ].join('\n')
      }
    )
    .setFooter({ text: "I'm being read. Hazukashii~" })
    .setColor(0x3498db);
}

async function handleCommand(client, message) {
  if (!botHasPermission(message.channel)) return;
  if (message.author.bot || !message.content.startsWith(COMMAND_PREFIX)) return;

  const args = message.content.slice(COMMAND_PREFIX.length).trim().split(/ +/);
  const command = args[0]?.toLowerCase();

  switch (command) {
    case 'help':
      return message.channel.send({ embeds: [getHelpEmbed()] });

    case 'list':
      return listMedia(message);

    case 'upload':
      return uploadCommand(message, args);

    case 'rename':
      return renameCommand(message, args);

    case 'delete':
      return deleteCommand(message, args);

    case 'convertmiles': {
      const km = await convertMiles(args[1]);
      return message.channel.send(`${args[1]} miles is about ${km} km`);
    }

    case 'convertkm': {
      const miles = await convertKM(args[1]);
      return message.channel.send(`${args[1]} km is about ${miles} miles`);
    }

    case 'convertmeters': {
      const [meters, feet, inches] = await convertMeters(args[1]);

      return message.channel.send(`For the feet lover, ${meters} m is about ${feet} ft and ${inches} inches`);
    }

    case 'convertfeet': {
      const [feet, inches, meters] = await convertFeet(args[1]);
      return message.channel.send(`${feet}'${inches} is about ${meters} m`);
    }

    case 'convertc': {
      const fahrenheit = await convertCelsius(args[1]);
      return message.channel.send(`${args[1]} °C is around ${fahrenheit} °F`);
    }

    case 'convertf': {
      const celsius = await convertFahrenheit(args[1]);
      return message.channel.send(`${args[1]} °F is about ${celsius} °C`);
    }

    case 'addbl':
      // Add YouTube channel to blacklist
      if (!hasPermission(message)) return;
      return newBlacklistChannel(message, args[1]);

    case 'setmines':
      // Set number of mines
      if (!hasPermission(message)) return;
      return placeMines(message, args[1]);

    case 'removemines':
      // Remove all mines
      if (!hasPermission(message)) return;
      return removeMines(message);

    case 'countmines':
      return hitCountRanking(client, message);

    default:
      return returnFile(message, command);
  }
}

module.exports = { handleCommand };
