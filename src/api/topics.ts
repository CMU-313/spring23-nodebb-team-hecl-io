import user = require('../user');
import topics = require('../topics');
import posts = require('../posts');
import meta = require('../meta');
import privileges = require('../privileges');

import apiHelpers = require('./helpers');
import websockets = require('../socket.io');
import socketHelpers = require('../socket.io/helpers');
import { TopicObject } from '../types';

const { doTopicAction } = apiHelpers;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
// const topicsAPI = module.exports;

type Session = {
    lastChatMessageTime: number
}

type Caller = {
    request: Request,
    session: Session,
    uid: number,
    ip: string,
}

type Data = {
    tids: string[],
    tid: string,
    uuid: string,
    cid: string,
    content: string,
    tags: string[],
    timestamp: number,
    timeStamp: string
}

type postData = {
    pid: string
}

type QueueResult = {
    uid: number,
    queued: boolean,
    topicData: TopicObject,
    pid: number
    postData: postData
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
export async function get(caller: Caller, data: Data) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const [userPrivileges, topic]: [privileges, TopicObject] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        privileges.topics.get(data.tid, caller.uid),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        topics.getTopicData(data.tid),
    ]) as [privileges, TopicObject];
    if (
        !topic ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        !userPrivileges.read ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        !userPrivileges['topics:read'] ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
        !privileges.topics.canViewDeletedScheduled(topic, userPrivileges)
    ) {
        return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return topic;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
export async function create(caller: Caller, data: Data) {
    if (!data) {
        throw new Error('[[error:invalid-data]]');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const payload = { ...data };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    payload.tags = payload.tags || [];
    apiHelpers.setDefaultPostData(caller, payload);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const isScheduling = parseInt(data.timeStamp, 10) > payload.timestamp;
    if (isScheduling) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (await privileges.categories.can('topics:schedule', data.cid, caller.uid)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            payload.timestamp = parseInt(data.timeStamp, 10);
        } else {
            throw new Error('[[error:no-privileges]]');
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await meta.blacklist.test(caller.ip);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const shouldQueue: boolean = await posts.shouldQueue(caller.uid, payload) as boolean;
    if (shouldQueue) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await posts.addToQueue(payload) as QueueResult;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const result: QueueResult = await topics.post(payload) as QueueResult;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await topics.thumbs.migrate(data.uuid, result.topicData.tid);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await socketHelpers.emitToUids('event:new_post', { posts: [result.postData] }, [caller.uid]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await socketHelpers.emitToUids('event:new_topic', result.topicData, [caller.uid]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await socketHelpers.notifyNew(caller.uid, 'newTopic', { posts: [result.postData], topic: result.topicData });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return result.topicData;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
export async function reply(caller: Caller, data: Data) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    if (!data || !data.tid || (meta.config.minimumPostLength !== 0 && !data.content)) {
        throw new Error('[[error:invalid-data]]');
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const payload = { ...data };
    apiHelpers.setDefaultPostData(caller, payload);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await meta.blacklist.test(caller.ip);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const shouldQueue: boolean = await posts.shouldQueue(caller.uid, payload) as boolean;
    if (shouldQueue) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await posts.addToQueue(payload) as QueueResult;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const postData: postData = await topics.reply(payload) as postData;
    // postData seems to be a subset of postObj, refactor?
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const postObj: string = await posts.getPostSummaryByPids([postData.pid], caller.uid, {}) as string;

    const result = {
        posts: [postData],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        'reputation:disabled': meta.config['reputation:disabled'] === 1,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        'downvote:disabled': meta.config['downvote:disabled'] === 1,
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    user.updateOnlineUsers(caller.uid);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    if (caller.uid) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await socketHelpers.emitToUids('event:new_post', result, [caller.uid]);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    } else if (caller.uid === 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        websockets.in('online_guests').emit('event:new_post', result);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await socketHelpers.notifyNew(caller.uid, 'newPost', result);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return postObj[0];
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
export async function del(caller: Caller, data: Data) {
    await doTopicAction('delete', 'event:topic_deleted', caller, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        tids: data.tids,
    });
}

export { del as delete };

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
export async function restore(caller: Caller, data: Data) {
    await doTopicAction('restore', 'event:topic_restored', caller, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        tids: data.tids,
    });
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
export async function purge(caller: Caller, data: Data) {
    await doTopicAction('purge', 'event:topic_purged', caller, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        tids: data.tids,
    });
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
export async function pin(caller: Caller, data: Data) {
    await doTopicAction('pin', 'event:topic_pinned', caller, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        tids: data.tids,
    });
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
export async function unpin(caller: Caller, data: Data) {
    await doTopicAction('unpin', 'event:topic_unpinned', caller, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        tids: data.tids,
    });
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
export async function resolve(caller: Caller, data: Data) {
    await doTopicAction('resolve', 'event:topic_resolved', caller, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        tids: data.tids,
    });
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
export async function unresolve(caller: Caller, data: Data) {
    await doTopicAction('unresolve', 'event:topic_unresolved', caller, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        tids: data.tids,
    });
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
export async function lock(caller: Caller, data: Data) {
    await doTopicAction('lock', 'event:topic_locked', caller, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        tids: data.tids,
    });
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
export async function unlock(caller: Caller, data: Data) {
    await doTopicAction('unlock', 'event:topic_unlocked', caller, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        tids: data.tids,
    });
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
export async function follow(caller: Caller, data: Data) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await topics.follow(data.tid, caller.uid);
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
export async function ignore(caller: Caller, data: Data) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await topics.ignore(data.tid, caller.uid);
}
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
export async function unfollow(caller: Caller, data: Data) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await topics.unfollow(data.tid, caller.uid);
}
