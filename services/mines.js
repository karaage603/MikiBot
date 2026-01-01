const {
  BOT_OWN_ID,
  MINES_ID,
  STREAM_CHANNEL,
  JP_CHANNEL,
  CHANNEL_IGNORE_LIST,
  HIT_CHANCE,
  EMOTE_CHANCE,
  ADMIN_ID,
  BOT_CHANNEL,
  MOCK_EMOTE,
  SMUG_EMOTE,
  POUT_EMOTE,
  PLEAD_EMOTE,
  INT_ZERO,
  MUTE_ROLE
} = require("../config/constants");

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '../data');
const dbPath = path.join(dataDir, 'mines.db');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);

async function placeMines(message, totalMines) {
  if (message.author.id === BOT_OWN_ID || totalMines <= INT_ZERO) return;

  const guildId = message.guildId;
  if (!guildId) return;

  const row = db.prepare('SELECT remaining_mines FROM guild_mines WHERE guild_id = ?').get(guildId);

  if (row && row.remaining_mines > 0) {
    await message.channel.send(
      `${row.remaining_mines} mine${row.remaining_mines === 1 ? '' : 's'} already exist${row.remaining_mines === 1 ? 's' : ''}. Shoo`
    );
    return;
  }

  db.prepare(`
    INSERT INTO guild_mines (guild_id, remaining_mines)
    VALUES (?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET remaining_mines = excluded.remaining_mines
  `).run(guildId, totalMines);

  await message.channel.send(`Placed ${totalMines} mine${totalMines === 1 ? '' : 's'}`);
}

async function removeMines(message) {
  const guildId = message.guildId || message.guild?.id;
  if (!guildId) return;

  // Insert row if not exists, or reset remaining_mines to 0
  db.prepare(`
    INSERT INTO guild_mines (guild_id, remaining_mines)
    VALUES (?, 0)
    ON CONFLICT(guild_id) DO UPDATE SET remaining_mines = 0
  `).run(guildId);

  message.channel.send('All mines removed');
}

async function checkMines(message) {
  const { author, channel, guild, content, member } = message;
  const userId = author.id;
  const guildId = guild?.id;

  if (
    author.bot ||
    userId === BOT_OWN_ID ||
    !guildId ||
    CHANNEL_IGNORE_LIST.includes(channel.id) ||
    (channel.id === STREAM_CHANNEL && (content.includes('!t') || content.includes('`') || content.includes('!tag')))
  ) return;

  if (!member) return;

  const isMikicord = guildId === '1405066352875540517';
  const isTestServer = guildId === '827930000372138004';
  const hasMineRole = member.roles.cache.has(MINES_ID) || (isTestServer && member.roles.cache.has('1451220231870742598'));
  if (!hasMineRole) return;

  const mineRow = db.prepare('SELECT remaining_mines FROM guild_mines WHERE guild_id = ?').get(guildId);
  if (!mineRow || mineRow.remaining_mines <= 0) return;

  const hitRoll = Math.random();
  if (isMikicord && hitRoll >= HIT_CHANCE) return; // test server has 100% hit chance for testing

  const hitCountStmt = db.prepare(`
    INSERT INTO guild_mine_hits (guild_id, user_id, hits)
    VALUES (?, ?, 1)
    ON CONFLICT(guild_id, user_id)
    DO UPDATE SET hits = hits + 1
  `);

  const updateMinesStmt = db.prepare(`
    UPDATE guild_mines SET remaining_mines = remaining_mines - 1 WHERE guild_id = ?
  `);

  const getHitCountStmt = db.prepare(`
    SELECT hits FROM guild_mine_hits WHERE guild_id = ? AND user_id = ?
  `);

  db.transaction(() => {
    updateMinesStmt.run(guildId);
    hitCountStmt.run(guildId, userId);
  })();

  // Get updated hit count
  const hitCountRow = getHitCountStmt.get(guildId, userId);
  const hitCount = hitCountRow?.hits || 1;
  const remainingMines = mineRow.remaining_mines - 1;
  const isAdmin = member.roles.cache.has(ADMIN_ID);

  // Apply mute role
  try {
    //if (!isAdmin) {
      if (MUTE_ROLE) {
      const target = member || await guild.members.fetch(userId);
      await target.roles.add(MUTE_ROLE, 'Muted for hitting mine');
      setTimeout(async () => {
        try {
          const fetched = await guild.members.fetch(userId);
          await fetched.roles.remove(MUTE_ROLE, 'Mute expired');
        } catch (err) {
            console.error('Could not remove mute role:', err);
          }
        }, 15 * 1000);
      } else {
        try {
          await member.timeout(15 * 1000, 'Timeout for 15 seconds');
        } catch (err) {
          console.error('Could not timeout member (no MUTE_ROLE):', err);
        }
      }
  } catch (err) {
    console.error('Error handling mute/timeout:', err);
  }

  const mineText = remainingMines === 1 ? 'mine' : 'mines';

  if (channel.id === JP_CHANNEL) {
    if (isAdmin) {
      await channel.send({
        content: ` -# ${author}タイムアウトできないんだけど〜、15秒くらいで合わせてほし〜んだけど ${PLEAD_EMOTE}`,
        flags: ['SuppressNotifications']
      });
    }
    await channel.send({
      content: `へ〜${author} はもう${hitCount} 回目の地雷？15秒タイムアウトされたの〜？ウケる〜！www\nあと${remainingMines} 個だよ〜`,
      flags: ['SuppressNotifications']
    });
  } else {
    if (isAdmin) {
      await channel.send({
        content: ` -# ${author} is a person I can't mute. Please pretend to be muted for 15 seconds ${PLEAD_EMOTE}`,
        flags: ['SuppressNotifications']
      });
    }
    await channel.send({
      content: `${author} hit a mine (${hitCount} so far) and has been muted for 15 seconds\n${remainingMines} ${mineText} left`,
      flags: ['SuppressNotifications']
    });
  }

  const emoteRoll = Math.random();
  await channel.send(emoteRoll > EMOTE_CHANCE ? MOCK_EMOTE : SMUG_EMOTE);
}

async function hitCountRanking(client, message) {
  if (message.channel.id !== BOT_CHANNEL) return;

  const guildId = message.guildId || message.guild?.id;
  const rows = db.prepare(`
    SELECT user_id, hits
    FROM guild_mine_hits
    WHERE guild_id = ?
    ORDER BY hits DESC
    LIMIT 10
  `).all(guildId);

  if (rows.length === 0) {
    await message.channel.send('No records yet');
    return;
  }

  const lines = [];
  let pos = 1;

  for (const row of rows) {
    const { user_id, hits } = row;
    if (!user_id || hits <= 0) continue;

    let displayName = user_id;
    try {
      const user = await client.users.fetch(user_id);
      displayName = user.username;
    } catch (err) {
      console.log(`Could not fetch username for ${user_id}`, err);
    }

    lines.push(`${pos}) ${displayName} : ${hits} mine${hits === 1 ? '' : 's'}`);
    pos++;
  }

  try {
    const requesterId = message.author.id;
    const userRow = db.prepare(`
      SELECT hits FROM guild_mine_hits WHERE guild_id = ? AND user_id = ?
    `).get(guildId, requesterId);

    if (userRow?.hits > 0) {
      const higherCountRow = db.prepare(`
        SELECT COUNT(*) AS higher FROM guild_mine_hits WHERE guild_id = ? AND hits > ?
      `).get(guildId, userRow.hits);

      const rank = higherCountRow ? higherCountRow.higher + 1 : 1;
      lines.push('');
      lines.push(`Your rank: ${rank}) ${message.author.username} : ${userRow.hits} mine${userRow.hits === 1 ? '' : 's'}`);
    } else {
      lines.push('');
      lines.push('You have no hits yet.');
    }
  } catch (err) {
    console.error('Error getting rank:', err);
  }

  await message.channel.send(`**Mine Magnet Leaderboard (Top 10):**\n${lines.join('\n')}`);
}

module.exports = {
  placeMines,
  removeMines,
  checkMines,
  hitCountRanking
};
