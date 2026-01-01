const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, './youtubeBlacklist.json');

let store = new Set();

async function load() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(FILE, 'utf8').catch(() => null);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) arr.forEach(id => store.add(id));
    }
  } catch (err) {
    console.error('youtubeBlacklistStore load error:', err);
  }
}

async function save() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify([...store], null, 2), 'utf8');
  } catch (err) {
    console.error('youtubeBlacklistStore save error:', err);
  }
}

async function add(channelId) {
  if (!channelId) return false;
  store.add(channelId);
  await save();
  return true;
}

async function remove(channelId) {
  const removed = store.delete(channelId);
  if (removed) await save();
  return removed;
}

function has(channelId) {
  return store.has(channelId);
}

function list() {
  return [...store];
}

// initialize
load().catch(() => {});

module.exports = {
  add,
  remove,
  has,
  list,
  // exposed for debug
  _debug_store: () => store
};