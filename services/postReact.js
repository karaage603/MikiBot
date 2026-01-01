const reactionCooldowns = new Map(); // messageId -> Map<emojiName, Set<userId>>
const COOLDOWN_MS = 20_000; // 20s per user per message per emoji
const localiseToEN = ['🌍','🌏','🌎','🇺🇸','🇬🇧','🇨🇦','🇳🇿','🇦🇺'];
const spoilerEmote = '👁️';
const deleteEmote = '❌';

function checkAndAddCooldown(messageId, userId, emojiName) {
  let emojiMap = reactionCooldowns.get(messageId);
  if (!emojiMap) {
    emojiMap = new Map();
    reactionCooldowns.set(messageId, emojiMap);
  }

  let set = emojiMap.get(emojiName);
  if (!set) {
    set = new Set();
    emojiMap.set(emojiName, set);
  }

  if (set.has(userId)) return false;

  set.add(userId);
  setTimeout(() => {
    set.delete(userId);
    if (set.size === 0) emojiMap.delete(emojiName);
    if (emojiMap.size === 0) reactionCooldowns.delete(messageId);
  }, COOLDOWN_MS);

  return true;
}

async function reactToPostedLinks(message, listOfSites) {
  if (!message?.content) return;

    const emojis = [];

  if (message.author.bot && message.content.includes('fxtwitter.com')) {
    emojis.push(localiseToEN[Math.floor(Math.random() * localiseToEN.length)]);
  }

    if (message.author.bot && !message.content.includes('||')) {
    const hasLink = Array.isArray(listOfSites) && listOfSites.length > 0
      ? listOfSites.some(site => message.content.includes(site))
      : /\b(?:https?:\/\/|www\.)[^\s]+\b/i.test(message.content);

      if (hasLink) emojis.push(spoilerEmote);
    }

  for (const emoji of emojis) {
      try {
      await message.react(emoji);
      await new Promise(r => setTimeout(r, 250));
      } catch (err) {
      console.error('React failed for', emoji, err);
        break;
      }
  }
}

async function deleteReactMonitoring(reaction, user, botOwnID, listOfSites, reactionTimeout) {
    // Skip bot reactions
    if (user.bot) return;

    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    const msg = reaction.message;
  if (!msg?.content || !msg.author?.bot || msg.author.id !== botOwnID) return;
  if (Date.now() - msg.createdTimestamp > reactionTimeout) return;
  if (reaction.emoji.name !== deleteEmote) return;

  const hasLink = Array.isArray(listOfSites) && listOfSites.some(site => msg.content.includes(site));
  if (!hasLink) return;

      await msg.delete();
}

// Convert fxtwitter links to English
async function convertFxTwitterToEnglish(reaction, user) {
  if (!user || user.bot) return;
  if (reaction.partial) await reaction.fetch();

  const emojiName = reaction.emoji?.name;
  if (!localiseToEN.includes(emojiName)) return;

  if (reaction.message?.partial) await reaction.message.fetch();
  const msg = reaction.message;
  if (!msg?.content || !msg.author?.bot || !/fxtwitter\.com/.test(msg.content)) return;
  if (msg.content.includes('/en') || msg.content.includes('||')) return;

  await msg.edit(msg.content + '/en');
}

// Spoiler messages when reacted
async function spoilerReactHandler(reaction, user, listOfSites = null) {
  if (!user || user.bot || reaction.emoji?.name !== spoilerEmote) return;

  if (reaction.partial) await reaction.fetch();
  if (reaction.message?.partial) await reaction.message.fetch();

    const msg = reaction.message;
  if (!msg?.content || !checkAndAddCooldown(msg.id, user.id, spoilerEmote)) return;
  if (msg.author.id !== msg.client.user.id) return;
    if (msg.content.includes('||')) return;
    if (msg.content.includes('fxtwitter.com') && msg.content.endsWith('/en')) return;

  const hasLink = Array.isArray(listOfSites) && listOfSites.length > 0
    ? listOfSites.some(site => msg.content.includes(site))
    : /\b(?:https?:\/\/|www\.)[^\s]+\b/i.test(msg.content);

  if (!hasLink) return;

  await msg.edit(`||${msg.content}||`);
}

module.exports = {
    reactToPostedLinks,
    deleteReactMonitoring,
    convertFxTwitterToEnglish,
    spoilerReactHandler
};
