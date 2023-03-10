"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.purge = exports.log = exports.get = exports.init = exports._types = void 0;
const lodash_1 = __importDefault(require("lodash"));
const database_1 = __importDefault(require("../database"));
const meta_1 = __importDefault(require("../meta"));
const user_1 = __importDefault(require("../user"));
const posts_1 = __importDefault(require("../posts"));
const categories_1 = __importDefault(require("../categories"));
const plugins_1 = __importDefault(require("../plugins"));
const translator_1 = __importDefault(require("../translator"));
const privileges_1 = __importDefault(require("../privileges"));
const _1 = __importDefault(require("."));
/**
 * Note: Plugins!
 *
 * You are able to define additional topic event types here.
 * Register to hook `filter:topicEvents.init` and append your custom type to the `types` object.
 * You can then log a custom topic event by calling `topics.events.log(tid, { type, uid });`
 * `uid` is optional; if you pass in a valid uid in the payload,
 * the user avatar/username will be rendered as part of the event text
 *
 */
// _types must be mutable to allow plugins to modify it.
// eslint-disable-next-line import/no-mutable-exports
exports._types = {
    pin: {
        icon: 'fa-thumb-tack',
        text: '[[topic:pinned-by]]',
    },
    unpin: {
        icon: 'fa-thumb-tack',
        text: '[[topic:unpinned-by]]',
    },
    resolve: {
        icon: 'fa-check',
        text: 'Resolved by',
    },
    unresolve: {
        icon: 'fa-times',
        text: 'Unresolved by',
    },
    lock: {
        icon: 'fa-lock',
        text: '[[topic:locked-by]]',
    },
    unlock: {
        icon: 'fa-unlock',
        text: '[[topic:unlocked-by]]',
    },
    delete: {
        icon: 'fa-trash',
        text: '[[topic:deleted-by]]',
    },
    restore: {
        icon: 'fa-trash-o',
        text: '[[topic:restored-by]]',
    },
    move: {
        icon: 'fa-arrow-circle-right',
        // text: '[[topic:moved-from-by]]',
    },
    'post-queue': {
        icon: 'fa-history',
        text: '[[topic:queued-by]]',
        href: '/post-queue',
    },
    backlink: {
        icon: 'fa-link',
        text: '[[topic:backlink]]',
    },
    fork: {
        icon: 'fa-code-fork',
        text: '[[topic:forked-by]]',
    },
};
async function init() {
    // Allow plugins to define additional topic event types
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { types } = await plugins_1.default.hooks.fire('filter:topicEvents.init', { types: exports._types });
    // No other way to safely extract types from plugins
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    exports._types = types;
}
exports.init = init;
async function getCategoryInfo(cids) {
    const uniqCids = lodash_1.default.uniq(cids);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const catData = await categories_1.default.getCategoriesFields(uniqCids, ['name', 'slug', 'icon', 'color', 'bgColor']);
    return lodash_1.default.zipObject(uniqCids, catData);
}
async function getUserInfo(uids) {
    uids = uids.filter((uid, idx) => !isNaN(parseInt(uid, 10)) && uids.indexOf(uid) === idx);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const userData = await user_1.default.getUsersFields(uids, ['picture', 'username', 'userslug']);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const userMap = userData.reduce((memo, cur) => memo.set(cur.uid, cur), new Map());
    userMap.set('system', {
        system: true,
    });
    return userMap;
}
async function modifyEvent({ tid, uid, eventIds, timestamps, events }) {
    // Add posts from post queue
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const isPrivileged = await user_1.default.isPrivileged(uid);
    if (isPrivileged) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const queuedPosts = await posts_1.default.getQueuedPosts({ tid }, { metadata: false });
        events.push(...queuedPosts.map(item => ({
            type: 'post-queue',
            timestamp: item.data.timestamp || Date.now(),
            uid: item.data.uid,
        })));
        queuedPosts.forEach((item) => {
            timestamps.push(item.data.timestamp || Date.now());
        });
    }
    const [users, fromCategories] = await Promise.all([
        getUserInfo(events.map((event) => event.uid).filter(Boolean)),
        getCategoryInfo(events.map((event) => event.fromCid).filter(Boolean)),
    ]);
    // Remove backlink events if backlinks are disabled
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    if (meta_1.default.config.topicBacklinks !== 1) {
        events = events.filter((event) => event.type !== 'backlink');
    }
    else {
        // remove backlinks that we dont have read permission
        const backlinkPids = events.filter(e => e.type === 'backlink')
            .map(e => e.href.split('/').pop());
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const pids = await privileges_1.default.posts.filter('topics:read', backlinkPids, uid);
        events = events.filter(e => e.type !== 'backlink' || pids.includes(e.href.split('/').pop()));
    }
    // Remove events whose types no longer exist (e.g. plugin uninstalled)
    events = events.filter((event) => exports._types.hasOwnProperty(event.type));
    // Add user & metadata
    events.forEach((event, idx) => {
        event.id = parseInt(eventIds[idx], 10);
        event.timestamp = timestamps[idx];
        event.timestampISO = new Date(timestamps[idx]).toISOString();
        if (event.hasOwnProperty('uid')) {
            event.user = users.get(event.uid === 'system' ? 'system' : parseInt(event.uid, 10));
        }
        if (event.hasOwnProperty('fromCid')) {
            event.fromCategory = fromCategories[event.fromCid];
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
            event.text = translator_1.default.compile('topic:moved-from-by', event.fromCategory.name);
        }
        Object.assign(event, exports._types[event.type]);
    });
    // Sort events
    events.sort((a, b) => a.timestamp - b.timestamp);
    return events;
}
async function get(tid, uid, reverse = false) {
    if (!await _1.default.exists(tid)) {
        throw new Error('[[error:no-topic]]');
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const oldEventIds = await database_1.default.getSortedSetRangeWithScores(`topic:${tid}:events`, 0, -1);
    const keys = oldEventIds.map((obj) => `topicEvent:${obj.value}`);
    const timestamps = oldEventIds.map((obj) => obj.score);
    const eventIds = oldEventIds.map((obj) => obj.value);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    let events = await database_1.default.getObjects(keys);
    events = await modifyEvent({ tid, uid, eventIds, timestamps, events });
    if (reverse) {
        events.reverse();
    }
    return events;
}
exports.get = get;
async function log(tid, payload) {
    const { type } = payload;
    const timestamp = payload.timestamp || Date.now();
    if (!exports._types.hasOwnProperty(type)) {
        throw new Error(`[[error:topic-event-unrecognized, ${type}]]`);
    }
    else if (!await _1.default.exists(tid)) {
        throw new Error('[[error:no-topic]]');
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const eventId = await database_1.default.incrObjectField('global', 'nextTopicEventId');
    await Promise.all([
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        database_1.default.setObject(`topicEvent:${eventId}`, payload),
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        database_1.default.sortedSetAdd(`topic:${tid}:events`, timestamp, eventId),
    ]);
    let events = await modifyEvent({
        tid: tid,
        uid: payload.uid,
        eventIds: [eventId],
        timestamps: [timestamp],
        events: [payload],
    });
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    ({ events } = await plugins_1.default.hooks.fire('filter:topic.events.log', { events }));
    return events;
}
exports.log = log;
async function purge(tid, eventIds = []) {
    if (eventIds.length) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const isTopicEvent = await database_1.default.isSortedSetMembers(`topic:${tid}:events`, eventIds);
        eventIds = eventIds.filter((id, index) => isTopicEvent[index]);
        await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            database_1.default.sortedSetRemove(`topic:${tid}:events`, eventIds),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            database_1.default.deleteAll(eventIds.map(id => `topicEvent:${id}`)),
        ]);
    }
    else {
        const keys = [`topic:${tid}:events`];
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const eventIds = await database_1.default.getSortedSetRange(keys[0], 0, -1);
        keys.push(...eventIds.map(id => `topicEvent:${id}`));
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await database_1.default.deleteAll(keys);
    }
}
exports.purge = purge;
