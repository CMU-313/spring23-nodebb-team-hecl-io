import _ from 'lodash';

import db from '../database';
import topics from '.';
import categories from '../categories';
import user from '../user';
import plugins from '../plugins';
import privileges from '../privileges';
import utils from '../utils';
import events from '../events';


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

interface topicDataType {
    tid: string,
    cid: string,
    uid: string,
    user?: object,
    events?: eventType[],
    isLocked?: boolean,
    locked?: boolean,
    scheduled?: boolean,
    lastposttime?: number,
    postcount?: number,
    votes?: number | string,
    viewcount?: number,
    pinExpiry?: number | undefined,
    pinExpiryISO?: string | undefined,
    isPinned?: boolean,
    pinned?: boolean,
    isResolved?: boolean,
    resolved?: boolean,
    upvotes?: number,
    downvotes?: number,
    timestamp?: number,
    deleted?: number,
}

type moveDataType = { cid: string; uid: string; fromCid: string; toCid: string; tid: string; }

interface toolsType {
    delete?: (arg0: string, arg1: string) => Promise<topicDataType>;
    restore?: (arg0: string, arg1: string) => Promise<topicDataType>;
    purge?: (arg0: string, arg1: string) => Promise<topicDataType>;
    lock?: (arg0: string, arg1: string) => Promise<topicDataType>;
    unlock?: (arg0: string, arg1: string) => Promise<topicDataType>;
    pin?: (arg0: string, arg1: string) => Promise<topicDataType>;
    unpin?: (arg0: string, arg1: string) => Promise<topicDataType>;
    resolve?: (arg0: string, arg1: string) => Promise<topicDataType>;
    unresolve?: (arg0: string, arg1: string) => Promise<topicDataType>;
    setPinExpiry?: (arg0: string, arg1: string | number, arg2: string) => Promise<void>;
    checkPinExpiry?: (arg0: string[]) => Promise<string[]>;
    orderPinnedTopics?: (arg0: string, arg1: { tid: string; order: number; }) => Promise<void>;
    move?: (tid: string, data: moveDataType) => Promise<void>;
}

type topicValueType = string | number | boolean | eventType[] | object | undefined;

interface topicsType {
    tools: toolsType;
    getTopicData: (arg0: string) => Promise<topicDataType>;
    delete: (arg0: string, arg1: string) => Promise<void>;
    restore: (arg0: string) => Promise<void>;
    events: typeof events;
    purgePostsAndTopic: (arg0: string, arg1: string) => Promise<void>;
    getTopicFields: (arg0: string, arg1: string[]) => Promise<topicDataType>;
    setTopicField: (arg0: string, arg1: string, arg2: topicValueType) => Promise<void>;
    deleteTopicField: (arg0: string, arg1: string) => Promise<void>;
    getTopicField: (arg0: string, arg1: string) => Promise<topicValueType>;
    getTopicTags: (arg0: string) => Promise<string[]>;
    setTopicFields: (arg0: string, arg1: { cid: string; oldCid: string; }) => Promise<void>;
    updateCategoryTagsCount: (arg0: string[], arg1: string[]) => Promise<string[]>;
}

export = function (Topics: topicsType) {
    const topicTools : toolsType = {};
    Topics.tools = topicTools;

    async function toggleDelete(tid: string, uid: string, isDelete: boolean) {
        const topicData : topicDataType = await Topics.getTopicData(tid);
        if (!topicData) {
            throw new Error('[[error:no-topic]]');
        }
        // Scheduled topics can only be purged
        if (topicData.scheduled) {
            throw new Error('[[error:invalid-data]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const canDelete : boolean = await privileges.topics.canDelete(tid, uid);

        type localDataType = {
            topicData: topicDataType,
            uid: string,
            isDelete: boolean,
            canDelete: boolean,
            canRestore: boolean,
        }
        const hook = isDelete ? 'delete' : 'restore';
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const data: localDataType = await plugins.hooks.fire(`filter:topic.${hook}`, { topicData: topicData, uid: uid, isDelete: isDelete, canDelete: canDelete, canRestore: canDelete });

        if ((!data.canDelete && data.isDelete) || (!data.canRestore && !data.isDelete)) {
            throw new Error('[[error:no-privileges]]');
        }
        if (data.topicData.deleted && data.isDelete) {
            throw new Error('[[error:topic-already-deleted]]');
        } else if (!data.topicData.deleted && !data.isDelete) {
            throw new Error('[[error:topic-already-restored]]');
        }
        if (data.isDelete) {
            await Topics.delete(data.topicData.tid, data.uid);
        } else {
            await Topics.restore(data.topicData.tid);
        }
        const events = await Topics.events.log(tid, { type: isDelete ? 'delete' : 'restore', uid });

        data.topicData.deleted = data.isDelete ? 1 : 0;

        if (data.isDelete) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
            await plugins.hooks.fire('action:topic.delete', { topic: data.topicData, uid: data.uid });
        } else {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
            await plugins.hooks.fire('action:topic.restore', { topic: data.topicData, uid: data.uid });
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const userData : { uid: string; username: string; userslug: string; } = await user.getUserFields(data.uid, ['username', 'userslug']);
        return {
            tid: data.topicData.tid,
            cid: data.topicData.cid,
            isDelete: data.isDelete,
            uid: data.uid,
            user: userData,
            events,
        };
    }

    async function toggleLock(tid: string, uid: string, lock: boolean) {
        const topicData = await Topics.getTopicFields(tid, ['tid', 'uid', 'cid']);
        if (!topicData || !topicData.cid) {
            throw new Error('[[error:no-topic]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const isAdminOrMod = await privileges.categories.isAdminOrMod(topicData.cid, uid);
        if (!isAdminOrMod) {
            throw new Error('[[error:no-privileges]]');
        }
        await Topics.setTopicField(tid, 'locked', lock ? 1 : 0);
        topicData.events = await Topics.events.log(tid, { type: lock ? 'lock' : 'unlock', uid });
        topicData.isLocked = lock; // deprecate in v2.0
        topicData.locked = lock;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        await plugins.hooks.fire('action:topic.lock', { topic: _.clone(topicData), uid: uid });
        return topicData;
    }

    async function toggleResolve(tid: string, uid: string, resolve: boolean) {
        const topicData = await Topics.getTopicData(tid);
        if (!topicData) {
            throw new Error('[[error:no-topic]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        if (uid !== 'system' && !await privileges.topics.isAdminOrMod(tid, uid)) {
            throw new Error('[[error:no-privileges]]');
        }

        const promises = [
            Topics.setTopicField(tid, 'resolved', resolve ? 1 : 0),
            Topics.events.log(tid, { type: resolve ? 'resolve' : 'unresolve', uid }),
        ];
        if (resolve) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
            promises.push(db.sortedSetAdd(`cid:${topicData.cid}:tids:resolved`, Date.now(), tid));
        } else {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
            promises.push(db.sortedSetRemove(`cid:${topicData.cid}:tids:resolved`, tid));
        }

        const results = await Promise.all(promises);

        topicData.isResolved = resolve; // deprecate in v2.0
        topicData.resolved = resolve;
        topicData.events = results[1];
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        await plugins.hooks.fire('action:topic.resolve', { topic: _.clone(topicData), uid });

        return topicData;
    }

    async function togglePin(tid: string, uid: string, pin: boolean) {
        const topicData = await Topics.getTopicData(tid);
        if (!topicData) {
            throw new Error('[[error:no-topic]]');
        }

        if (topicData.scheduled) {
            throw new Error('[[error:cant-pin-scheduled]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        if (uid !== 'system' && !await privileges.topics.isAdminOrMod(tid, uid)) {
            throw new Error('[[error:no-privileges]]');
        }

        const promises = [
            Topics.setTopicField(tid, 'pinned', pin ? 1 : 0),
            Topics.events.log(tid, { type: pin ? 'pin' : 'unpin', uid }),
        ];
        if (pin) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
            promises.push(db.sortedSetAdd(`cid:${topicData.cid}:tids:pinned`, Date.now(), tid));
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
            promises.push(db.sortedSetsRemove([
                `cid:${topicData.cid}:tids`,
                `cid:${topicData.cid}:tids:posts`,
                `cid:${topicData.cid}:tids:votes`,
                `cid:${topicData.cid}:tids:views`,
            ], tid));
        } else {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
            promises.push(db.sortedSetRemove(`cid:${topicData.cid}:tids:pinned`, tid));
            promises.push(Topics.deleteTopicField(tid, 'pinExpiry'));
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
            promises.push(db.sortedSetAddBulk([
                [`cid:${topicData.cid}:tids`, topicData.lastposttime, tid],
                [`cid:${topicData.cid}:tids:posts`, topicData.postcount, tid],
                [`cid:${topicData.cid}:tids:votes`, parseInt(topicData.votes as string, 10) || 0, tid],
                [`cid:${topicData.cid}:tids:views`, topicData.viewcount, tid],
            ]));
            topicData.pinExpiry = undefined;
            topicData.pinExpiryISO = undefined;
        }

        const results = await Promise.all(promises);

        topicData.isPinned = pin; // deprecate in v2.0
        topicData.pinned = pin;
        topicData.events = results[1];
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        await plugins.hooks.fire('action:topic.pin', { topic: _.clone(topicData), uid });
        return topicData;
    }

    topicTools.delete = async function (tid: string, uid: string) {
        return await toggleDelete(tid, uid, true);
    };

    topicTools.restore = async function (tid: string, uid: string) {
        return await toggleDelete(tid, uid, false);
    };

    topicTools.purge = async function (tid, uid) {
        const topicData = await Topics.getTopicData(tid);
        if (!topicData) {
            throw new Error('[[error:no-topic]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const canPurge = await privileges.topics.canPurge(tid, uid);
        if (!canPurge) {
            throw new Error('[[error:no-privileges]]');
        }

        await Topics.purgePostsAndTopic(tid, uid);
        return { tid: tid, cid: topicData.cid, uid: uid };
    };

    topicTools.lock = async function (tid: string, uid: string) {
        return await toggleLock(tid, uid, true);
    };

    topicTools.unlock = async function (tid: string, uid: string) {
        return await toggleLock(tid, uid, false);
    };

    topicTools.pin = async function (tid: string, uid: string) {
        return await togglePin(tid, uid, true);
    };

    topicTools.unpin = async function (tid: string, uid: string) {
        return await togglePin(tid, uid, false);
    };

    topicTools.resolve = async function (tid: string, uid: string) {
        return await toggleResolve(tid, uid, true);
    };

    topicTools.unresolve = async function (tid: string, uid: string) {
        return await toggleResolve(tid, uid, false);
    };

    topicTools.setPinExpiry = async function (tid: string, expiry: string | number, uid: string) {
        if (isNaN(parseInt(expiry as string, 10)) || expiry as number <= Date.now()) {
            throw new Error('[[error:invalid-data]]');
        }

        const topicData = await Topics.getTopicFields(tid, ['tid', 'uid', 'cid']);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const isAdminOrMod = await privileges.categories.isAdminOrMod(topicData.cid, uid);
        if (!isAdminOrMod) {
            throw new Error('[[error:no-privileges]]');
        }

        await Topics.setTopicField(tid, 'pinExpiry', expiry as number);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        await plugins.hooks.fire('action:topic.setPinExpiry', { topic: _.clone(topicData), uid: uid });
    };

    topicTools.checkPinExpiry = async function (tids: string[]) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const expiry : string[] = (await topics.getTopicsFields(tids, ['pinExpiry'])).map((obj: { pinExpiry: number; }) => obj.pinExpiry);
        const now = Date.now();

        tids = await Promise.all(tids.map(async (tid, idx) => {
            if (expiry[idx] && parseInt(expiry[idx], 10) <= now) {
                await togglePin(tid, 'system', false);
                return null;
            }

            return tid;
        }));
        return tids.filter(Boolean);
    };

    topicTools.orderPinnedTopics = async function (uid: string, data: { tid: string; order: number; }) {
        const { tid, order } = data;
        const cid = await Topics.getTopicField(tid, 'cid');
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        if (!cid || !tid || !utils.isNumber(order) || order < 0) {
            throw new Error('[[error:invalid-data]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const isAdminOrMod = await privileges.categories.isAdminOrMod(cid, uid);
        if (!isAdminOrMod) {
            throw new Error('[[error:no-privileges]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const pinnedTids: string[] = await db.getSortedSetRange(`cid:${cid as string}:tids:pinned`, 0, -1);
        const currentIndex: number = pinnedTids.indexOf(String(tid));
        if (currentIndex === -1) {
            return;
        }
        const newOrder = pinnedTids.length - order - 1;
        // moves tid to index order in the array
        if (pinnedTids.length > 1) {
            pinnedTids.splice(Math.max(0, newOrder), 0, pinnedTids.splice(currentIndex, 1)[0]);
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        await db.sortedSetAdd(
            `cid:${cid as string}:tids:pinned`,
            pinnedTids.map((tid, index) => index),
            pinnedTids
        );
    };

    topicTools.move = async function (tid: string, data: moveDataType) {
        // const cid = parseInt(data.cid, 10);
        const { cid } = data;
        const topicData: topicDataType = await Topics.getTopicData(tid);
        if (!topicData) {
            throw new Error('[[error:no-topic]]');
        }
        if (cid === topicData.cid) {
            throw new Error('[[error:cant-move-topic-to-same-category]]');
        }
        const tags = await Topics.getTopicTags(tid);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        await db.sortedSetsRemove([
            `cid:${topicData.cid}:tids`,
            `cid:${topicData.cid}:tids:pinned`,
            `cid:${topicData.cid}:tids:posts`,
            `cid:${topicData.cid}:tids:votes`,
            `cid:${topicData.cid}:tids:views`,
            `cid:${topicData.cid}:tids:lastposttime`,
            `cid:${topicData.cid}:recent_tids`,
            `cid:${topicData.cid}:uid:${topicData.uid}:tids`,
            ...tags.map(tag => `cid:${topicData.cid}:tag:${tag}:topics`),
        ], tid);

        topicData.postcount = topicData.postcount || 0;
        const votes = topicData.upvotes - topicData.downvotes;

        const bulk = [
            [`cid:${cid}:tids:lastposttime`, topicData.lastposttime, tid],
            [`cid:${cid}:uid:${topicData.uid}:tids`, topicData.timestamp, tid],
            ...tags.map(tag => [`cid:${cid}:tag:${tag}:topics`, topicData.timestamp, tid]),
        ];
        if (topicData.pinned) {
            bulk.push([`cid:${cid}:tids:pinned`, Date.now(), tid]);
        } else {
            bulk.push([`cid:${cid}:tids`, topicData.lastposttime, tid]);
            bulk.push([`cid:${cid}:tids:posts`, topicData.postcount, tid]);
            bulk.push([`cid:${cid}:tids:votes`, votes, tid]);
            bulk.push([`cid:${cid}:tids:views`, topicData.viewcount, tid]);
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        await db.sortedSetAddBulk(bulk);

        const oldCid = topicData.cid;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await categories.moveRecentReplies(tid, oldCid, cid);

        await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
            categories.incrementCategoryFieldBy(oldCid, 'topic_count', -1),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
            categories.incrementCategoryFieldBy(cid, 'topic_count', 1),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
            categories.updateRecentTidForCid(cid),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
            categories.updateRecentTidForCid(oldCid),
            Topics.setTopicFields(tid, {
                cid: cid,
                oldCid: oldCid,
            }),
            Topics.updateCategoryTagsCount([oldCid, cid], tags),
            Topics.events.log(tid, { type: 'move', uid: data.uid, fromCid: oldCid }),
        ]);
        const hookData = _.clone(data);
        hookData.fromCid = oldCid;
        hookData.toCid = cid;
        hookData.tid = tid;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        await plugins.hooks.fire('action:topic.move', hookData);
    };
};
