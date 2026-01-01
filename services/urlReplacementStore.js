const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, './urlReplacements.json');
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let store = new Map();

async function load() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        const raw = await fs.readFile(DATA_FILE, 'utf8').catch(() => null);
        if (raw) {
            const obj = JSON.parse(raw);
            const now = Date.now();
            for (const [msgId, entry] of Object.entries(obj)) {
                // only keep unexpired
                if (!entry.ts || now - entry.ts > TTL_MS) continue;
                store.set(msgId, entry);
            }
        }
    } catch (err) {
        console.error('urlReplacementStore load error:', err);
    }
}

async function save() {
    try {
        const obj = {};
        for (const [k, v] of store.entries()) obj[k] = v;
        await fs.writeFile(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
        console.error('urlReplacementStore save error:', err);
    }
}

function cleanupExpired() {
    const now = Date.now();
    let changed = false;
    for (const [k, v] of store.entries()) {
        if (!v.ts || now - v.ts > TTL_MS) {
            store.delete(k);
            changed = true;
        }
    }
    if (changed) save().catch(() => {});
}

function addReplacement(messageId, ownerId) {
    store.set(messageId, { ownerId, ts: Date.now() });
    return save();
}

function getReplacement(messageId) {
    const entry = store.get(messageId);
    if (!entry) return null;
    if (Date.now() - entry.ts > TTL_MS) {
        store.delete(messageId);
        save().catch(() => {});
        return null;
    }
    return entry; // { ownerId, ts }
}

function deleteReplacement(messageId) {
    const existed = store.delete(messageId);
    if (existed) save().catch(() => {});
    return existed;
}

// initialize
load().catch(() => {});
setInterval(cleanupExpired, CLEANUP_INTERVAL_MS);

module.exports = {
    addReplacement,
    getReplacement,
    deleteReplacement,
    // exposed for tests or manual cleanup if needed:
    _debug_getStore: () => store
};