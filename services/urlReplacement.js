const { botHasPermission } = require('./../filemanager.js');
const { COMMAND_PREFIX } = require('../config/constants.js');
require('dotenv').config();

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function urlReplacement(message) {
  if (
    message.author.bot ||
    message.content.startsWith(COMMAND_PREFIX) ||
    !botHasPermission(message.channel) ||
    message.content.includes('youtube.com')
  ) return;

  const content = message.content;
  const spoilered = content.includes('||');

  // Twitter → fxtwitter
  const twitterRegex = /https?:\/\/(?:www\.)?(twitter|x)\.com\/([^\/\s]+)\/status\/(\d+)/g;
  const tweetMatches = Array.from(content.matchAll(twitterRegex));

  if (tweetMatches.length > 0) {
    await delay(1000);
    const converted = tweetMatches.map(m => `https://fxtwitter.com/${m[2]}/status/${m[3]}`);
    const reply = spoilered ? `||${converted.join('\n')}||` : converted.join('\n');
    await message.channel.send(reply);
      await message.suppressEmbeds?.(true);
    return;
  }

  // Generic replacements
  const replacements = [
    { regex: /https?:\/\/(?:www\.)?instagram\.com\/([^\s]+)/g, domain: 'https://kkinstagram.com/' },
    { regex: /https?:\/\/(?:www\.)?reddit\.com\/([^\s]+)/g, domain: 'https://rxddit.com/' },
    { regex: /https?:\/\/(?:www\.)?tiktok\.com\/([^\s]+)/g, domain: 'https://tfxktok.com/' }
  ];

  for (const { regex, domain } of replacements) {
    if (regex.test(content)) {
      const replaced = content.replace(regex, `${domain}$1`);
      if (replaced !== content && replaced.trim() !== '') {
        await message.channel.send(replaced);
      await message.suppressEmbeds?.(true);
    }
    return;
  }
}
}

module.exports = { urlReplacement };
