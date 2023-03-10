"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const lodash_1 = __importDefault(require("lodash"));
const database_1 = __importDefault(require("../database"));
const _1 = __importDefault(require("."));
const categories_1 = __importDefault(require("../categories"));
const user_1 = __importDefault(require("../user"));
const plugins_1 = __importDefault(require("../plugins"));
const privileges_1 = __importDefault(require("../privileges"));
const utils_1 = __importDefault(require("../utils"));
module.exports = function (Topics) {
    const topicTools = {};
    Topics.tools = topicTools;
    async function toggleDelete(tid, uid, isDelete) {
        const topicData = await Topics.getTopicData(tid);
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
        const canDelete = await privileges_1.default.topics.canDelete(tid, uid);
        const hook = isDelete ? 'delete' : 'restore';
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const data = await plugins_1.default.hooks.fire(`filter:topic.${hook}`, { topicData: topicData, uid: uid, isDelete: isDelete, canDelete: canDelete, canRestore: canDelete });
        if ((!data.canDelete && data.isDelete) || (!data.canRestore && !data.isDelete)) {
            throw new Error('[[error:no-privileges]]');
        }
        if (data.topicData.deleted && data.isDelete) {
            throw new Error('[[error:topic-already-deleted]]');
        }
        else if (!data.topicData.deleted && !data.isDelete) {
            throw new Error('[[error:topic-already-restored]]');
        }
        if (data.isDelete) {
            await Topics.delete(data.topicData.tid, data.uid);
        }
        else {
            await Topics.restore(data.topicData.tid);
        }
        const events = await Topics.events.log(tid, { type: isDelete ? 'delete' : 'restore', uid });
        data.topicData.deleted = data.isDelete ? 1 : 0;
        if (data.isDelete) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
            await plugins_1.default.hooks.fire('action:topic.delete', { topic: data.topicData, uid: data.uid });
        }
        else {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
            await plugins_1.default.hooks.fire('action:topic.restore', { topic: data.topicData, uid: data.uid });
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const userData = await user_1.default.getUserFields(data.uid, ['username', 'userslug']);
        return {
            tid: data.topicData.tid,
            cid: data.topicData.cid,
            isDelete: data.isDelete,
            uid: data.uid,
            user: userData,
            events,
        };
    }
    async function toggleLock(tid, uid, lock) {
        const topicData = await Topics.getTopicFields(tid, ['tid', 'uid', 'cid']);
        if (!topicData || !topicData.cid) {
            throw new Error('[[error:no-topic]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const isAdminOrMod = await privileges_1.default.categories.isAdminOrMod(topicData.cid, uid);
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
        await plugins_1.default.hooks.fire('action:topic.lock', { topic: lodash_1.default.clone(topicData), uid: uid });
        return topicData;
    }
    async function toggleResolve(tid, uid, resolve) {
        const topicData = await Topics.getTopicData(tid);
        if (!topicData) {
            throw new Error('[[error:no-topic]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        if (uid !== 'system' && !await privileges_1.default.topics.isAdminOrMod(tid, uid)) {
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
            promises.push(database_1.default.sortedSetAdd(`cid:${topicData.cid}:tids:resolved`, Date.now(), tid));
        }
        else {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
            promises.push(database_1.default.sortedSetRemove(`cid:${topicData.cid}:tids:resolved`, tid));
        }
        const results = await Promise.all(promises);
        topicData.isResolved = resolve; // deprecate in v2.0
        topicData.resolved = resolve;
        topicData.events = results[1];
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        await plugins_1.default.hooks.fire('action:topic.resolve', { topic: lodash_1.default.clone(topicData), uid });
        return topicData;
    }
    async function togglePin(tid, uid, pin) {
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
        if (uid !== 'system' && !await privileges_1.default.topics.isAdminOrMod(tid, uid)) {
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
            promises.push(database_1.default.sortedSetAdd(`cid:${topicData.cid}:tids:pinned`, Date.now(), tid));
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
            promises.push(database_1.default.sortedSetsRemove([
                `cid:${topicData.cid}:tids`,
                `cid:${topicData.cid}:tids:posts`,
                `cid:${topicData.cid}:tids:votes`,
                `cid:${topicData.cid}:tids:views`,
            ], tid));
        }
        else {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
            promises.push(database_1.default.sortedSetRemove(`cid:${topicData.cid}:tids:pinned`, tid));
            promises.push(Topics.deleteTopicField(tid, 'pinExpiry'));
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
            promises.push(database_1.default.sortedSetAddBulk([
                [`cid:${topicData.cid}:tids`, topicData.lastposttime, tid],
                [`cid:${topicData.cid}:tids:posts`, topicData.postcount, tid],
                [`cid:${topicData.cid}:tids:votes`, parseInt(topicData.votes, 10) || 0, tid],
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
        await plugins_1.default.hooks.fire('action:topic.pin', { topic: lodash_1.default.clone(topicData), uid });
        return topicData;
    }
    topicTools.delete = async function (tid, uid) {
        return await toggleDelete(tid, uid, true);
    };
    topicTools.restore = async function (tid, uid) {
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
        const canPurge = await privileges_1.default.topics.canPurge(tid, uid);
        if (!canPurge) {
            throw new Error('[[error:no-privileges]]');
        }
        await Topics.purgePostsAndTopic(tid, uid);
        return { tid: tid, cid: topicData.cid, uid: uid };
    };
    topicTools.lock = async function (tid, uid) {
        return await toggleLock(tid, uid, true);
    };
    topicTools.unlock = async function (tid, uid) {
        return await toggleLock(tid, uid, false);
    };
    topicTools.pin = async function (tid, uid) {
        return await togglePin(tid, uid, true);
    };
    topicTools.unpin = async function (tid, uid) {
        return await togglePin(tid, uid, false);
    };
    topicTools.resolve = async function (tid, uid) {
        return await toggleResolve(tid, uid, true);
    };
    topicTools.unresolve = async function (tid, uid) {
        return await toggleResolve(tid, uid, false);
    };
    topicTools.setPinExpiry = async function (tid, expiry, uid) {
        if (isNaN(parseInt(expiry, 10)) || expiry <= Date.now()) {
            throw new Error('[[error:invalid-data]]');
        }
        const topicData = await Topics.getTopicFields(tid, ['tid', 'uid', 'cid']);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const isAdminOrMod = await privileges_1.default.categories.isAdminOrMod(topicData.cid, uid);
        if (!isAdminOrMod) {
            throw new Error('[[error:no-privileges]]');
        }
        await Topics.setTopicField(tid, 'pinExpiry', expiry);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        await plugins_1.default.hooks.fire('action:topic.setPinExpiry', { topic: lodash_1.default.clone(topicData), uid: uid });
    };
    topicTools.checkPinExpiry = async function (tids) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const expiry = (await _1.default.getTopicsFields(tids, ['pinExpiry'])).map((obj) => obj.pinExpiry);
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
    topicTools.orderPinnedTopics = async function (uid, data) {
        const { tid, order } = data;
        const cid = await Topics.getTopicField(tid, 'cid');
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        if (!cid || !tid || !utils_1.default.isNumber(order) || order < 0) {
            throw new Error('[[error:invalid-data]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const isAdminOrMod = await privileges_1.default.categories.isAdminOrMod(cid, uid);
        if (!isAdminOrMod) {
            throw new Error('[[error:no-privileges]]');
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const pinnedTids = await database_1.default.getSortedSetRange(`cid:${cid}:tids:pinned`, 0, -1);
        const currentIndex = pinnedTids.indexOf(String(tid));
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
        await database_1.default.sortedSetAdd(`cid:${cid}:tids:pinned`, pinnedTids.map((tid, index) => index), pinnedTids);
    };
    topicTools.move = async function (tid, data) {
        // const cid = parseInt(data.cid, 10);
        const { cid } = data;
        const topicData = await Topics.getTopicData(tid);
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
        await database_1.default.sortedSetsRemove([
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
        }
        else {
            bulk.push([`cid:${cid}:tids`, topicData.lastposttime, tid]);
            bulk.push([`cid:${cid}:tids:posts`, topicData.postcount, tid]);
            bulk.push([`cid:${cid}:tids:votes`, votes, tid]);
            bulk.push([`cid:${cid}:tids:views`, topicData.viewcount, tid]);
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        await database_1.default.sortedSetAddBulk(bulk);
        const oldCid = topicData.cid;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await categories_1.default.moveRecentReplies(tid, oldCid, cid);
        await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
            categories_1.default.incrementCategoryFieldBy(oldCid, 'topic_count', -1),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
            categories_1.default.incrementCategoryFieldBy(cid, 'topic_count', 1),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
            categories_1.default.updateRecentTidForCid(cid),
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
            categories_1.default.updateRecentTidForCid(oldCid),
            Topics.setTopicFields(tid, {
                cid: cid,
                oldCid: oldCid,
            }),
            Topics.updateCategoryTagsCount([oldCid, cid], tags),
            Topics.events.log(tid, { type: 'move', uid: data.uid, fromCid: oldCid }),
        ]);
        const hookData = lodash_1.default.clone(data);
        hookData.fromCid = oldCid;
        hookData.toCid = cid;
        hookData.tid = tid;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        await plugins_1.default.hooks.fire('action:topic.move', hookData);
    };
};
