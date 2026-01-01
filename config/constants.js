module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    BOT_OWN_ID: process.env.BOT_OWN_ID,
    MINES_ID: process.env.MINES_ID,
    ADMIN_ID: process.env.ADMIN_ID,
    JP_CHANNEL: process.env.JP_CHANNEL,
    STREAM_CHANNEL: process.env.STREAM_CHANNEL,
    MUTE_ROLE: process.env.MUTE_ROLE,
    CHANNEL_IGNORE_LIST: [
        process.env.IGNORE_CHANNEL1,
        process.env.IGNORE_CHANNEL2,
        process.env.IGNORE_CHANNEL3
    ],
    BOT_CHANNEL: process.env.BOT_CHANNEL,
    SITE_LIST: [
        "girlcockx.com",
        "fxtwitter.com",
        "vxtwitter.com",
        "phixiv.net",
        "fixupx.com",
        "cunnyx.com",
        "fixvx.com",
        "kkinstagram.com"
    ],
    MAXLINKCOUNT: 10,
    WAIT_FOR_EMBED_TIME: 3000,
    REACTION_TIMEOUT: 24 * 60 * 60 * 1000, // 5 minutes in milliseconds
    HIT_CHANCE: 0.02,
    EMOTE_CHANCE:0.5,
    //MOCK_EMOTE: '<:lunlun:1447104211895586929>',
    MOCK_EMOTE: '<:MikiMock:1450273547313217586>',
    SMUG_EMOTE: '<:MikiSmug:1414442662752424106>',
    POUT_EMOTE: '<:MikiPout:1450273931687891024>',
    PLEAD_EMOTE: '<:MikiUoh:1452131661147013152>',
    INT_ZERO: 0,
    COMMAND_PREFIX: "."
};
