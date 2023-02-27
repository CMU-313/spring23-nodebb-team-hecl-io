

import _ from 'lodash';
import db from '../database';
import meta from '../meta';
import user from '../user';
import posts from '../posts';
import categories from '../categories';
import plugins from '../plugins';
import translator from '../translator';
import privileges from '../privileges';
import topics from '.';

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
export let _types = {
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

type userMapType = Map<string | number, _.Dictionary<string | boolean>>

interface eventType {
    type: string | number;
    timestamp: number;
    uid: string;
    id?: number;
    timestampISO?: string;
    hasOwnProperty?: (arg0: string) => boolean;
    user?: _.Dictionary<string | boolean>;
    fromCategory?: _.Dictionary<string | unknown>;
    fromCid?: string | number;
    text?: string;
    href?: string;
}

interface eventsType {
    tid: number,
    uid: string | number,
    eventIds: string[],
    timestamps: number[],
    events: eventType[],
}

export async function init() {
    // Allow plugins to define additional topic event types
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { types } = await plugins.hooks.fire('filter:topicEvents.init', { types: _types });
    // No other way to safely extract types from plugins
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    _types = types;
}

async function getCategoryInfo(cids: _.List<_.PropertyName>) : Promise<_.Dictionary<_.Dictionary<string | unknown>>> {
    const uniqCids : _.List<_.PropertyName> = _.uniq(cids);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const catData : _.List<_.Dictionary<unknown>> = await categories.getCategoriesFields(uniqCids, ['name', 'slug', 'icon', 'color', 'bgColor']);
    return _.zipObject(uniqCids, catData);
}

async function getUserInfo(uids: string[]) {
    uids = uids.filter((uid: string, idx: number) => !isNaN(parseInt(uid, 10)) && uids.indexOf(uid) === idx);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const userData : _.Dictionary<string | boolean>[] = await user.getUsersFields(uids, ['picture', 'username', 'userslug']);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const userMap : userMapType = userData.reduce(
        (memo: userMapType, cur: _.Dictionary<string>) => memo.set(cur.uid, cur), new Map()
    );
    userMap.set('system', {
        system: true,
    });

    return userMap;
}

async function modifyEvent({ tid, uid, eventIds, timestamps, events } : eventsType) {
    // Add posts from post queue
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const isPrivileged : boolean = await user.isPrivileged(uid);
    if (isPrivileged) {
        type postQueueType = { data: { timestamp: number; uid: string; }; }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const queuedPosts : postQueueType[] = await posts.getQueuedPosts({ tid }, { metadata: false });
        events.push(...queuedPosts.map(item => ({
            type: 'post-queue',
            timestamp: item.data.timestamp || Date.now(),
            uid: item.data.uid,
        })));
        queuedPosts.forEach((item: postQueueType) => {
            timestamps.push(item.data.timestamp || Date.now());
        });
    }

    const [users, fromCategories] = await Promise.all([
        getUserInfo(events.map((event: eventType) => event.uid).filter(Boolean)),
        getCategoryInfo(events.map((event: eventType) => event.fromCid).filter(Boolean)),
    ]);

    // Remove backlink events if backlinks are disabled
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    if (meta.config.topicBacklinks !== 1) {
        events = events.filter((event: eventType) => event.type !== 'backlink');
    } else {
        // remove backlinks that we dont have read permission
        const backlinkPids = events.filter(e => e.type === 'backlink')
            .map(e => e.href.split('/').pop());
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const pids : string[] = await privileges.posts.filter('topics:read', backlinkPids, uid);
        events = events.filter(
            e => e.type !== 'backlink' || pids.includes(e.href.split('/').pop())
        );
    }

    // Remove events whose types no longer exist (e.g. plugin uninstalled)
    events = events.filter((event: { type: PropertyKey; }) => _types.hasOwnProperty(event.type));

    // Add user & metadata
    events.forEach((event: eventType, idx: number) => {
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
            event.text = translator.compile('topic:moved-from-by', event.fromCategory.name);
        }

        Object.assign(event, _types[event.type]);
    });

    // Sort events
    events.sort((a, b) => a.timestamp - b.timestamp);

    return events;
}

export async function get(tid: number, uid: number, reverse = false) {
    if (!await topics.exists(tid)) {
        throw new Error('[[error:no-topic]]');
    }
    type localEventType = {
        score: number,
        value: string
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const oldEventIds : localEventType[] = await db.getSortedSetRangeWithScores(`topic:${tid}:events`, 0, -1);
    const keys = oldEventIds.map((obj: localEventType) => `topicEvent:${obj.value}`);
    const timestamps = oldEventIds.map((obj: localEventType) => obj.score);
    const eventIds : string[] = oldEventIds.map((obj: localEventType) => obj.value);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    let events : eventType[] = await db.getObjects(keys);
    events = await modifyEvent({ tid, uid, eventIds, timestamps, events });
    if (reverse) {
        events.reverse();
    }
    return events;
}

export async function log(tid: number, payload: eventType) {
    const { type } = payload;
    const timestamp = payload.timestamp || Date.now();
    if (!_types.hasOwnProperty(type)) {
        throw new Error(`[[error:topic-event-unrecognized, ${type}]]`);
    } else if (!await topics.exists(tid)) {
        throw new Error('[[error:no-topic]]');
    }

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const eventId : string = await db.incrObjectField('global', 'nextTopicEventId');

    await Promise.all([
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        db.setObject(`topicEvent:${eventId}`, payload),
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        db.sortedSetAdd(`topic:${tid}:events`, timestamp, eventId),
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
    ({ events } = await plugins.hooks.fire('filter:topic.events.log', { events }));
    return events;
}

export async function purge(tid: number, eventIds: string[] = []) {
    if (eventIds.length) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const isTopicEvent : boolean[] = await db.isSortedSetMembers(`topic:${tid}:events`, eventIds);
        eventIds = eventIds.filter((id, index) => isTopicEvent[index]);
        await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            db.sortedSetRemove(`topic:${tid}:events`, eventIds),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            db.deleteAll(eventIds.map(id => `topicEvent:${id}`)),
        ]);
    } else {
        const keys = [`topic:${tid}:events`];
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const eventIds : string[] = await db.getSortedSetRange(keys[0], 0, -1);
        keys.push(...eventIds.map(id => `topicEvent:${id}`));
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await db.deleteAll(keys);
    }
}
