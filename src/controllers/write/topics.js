"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEvent = exports.getEvents = exports.reorderThumbs = exports.deleteThumb = exports.migrateThumbs = exports.addThumb = exports.getThumbs = exports.deleteTags = exports.addTags = exports.unfollow = exports.ignore = exports.follow = exports.unlock = exports.lock = exports.unresolve = exports.resolve = exports.unpin = exports.pin = exports.purge = exports.restore = exports.delete = exports.del = exports.reply = exports.create = exports.get = void 0;
const validator_1 = __importDefault(require("validator"));
const database_1 = __importDefault(require("../../database"));
const api_1 = __importDefault(require("../../api"));
const topics_1 = __importDefault(require("../../topics"));
const privileges_1 = __importDefault(require("../../privileges"));
const helpers_1 = __importDefault(require("../helpers"));
const middleware_1 = __importDefault(require("../../middleware"));
const uploads_1 = __importDefault(require("../uploads"));
const get = async (req, res) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await helpers_1.default.formatApiResponse(200, res, await api_1.default.topics.get(req, req.params));
};
exports.get = get;
async function lockPosting(req, error) {
    const id = req.uid > 0 ? req.uid : req.sessionID;
    const value = `posting${id}`;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const count = await database_1.default.incrObjectField('locks', value);
    if (count > 1) {
        throw new Error(error);
    }
    return value;
}
const create = async (req, res) => {
    const id = await lockPosting(req, '[[error:already-posting]]');
    try {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const payload = await api_1.default.topics.create(req, req.body);
        if (payload.queued) {
            await helpers_1.default.formatApiResponse(202, res, payload);
        }
        else {
            await helpers_1.default.formatApiResponse(200, res, payload);
        }
    }
    finally {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await database_1.default.deleteObjectField('locks', id);
    }
};
exports.create = create;
const reply = async (req, res) => {
    const id = await lockPosting(req, '[[error:already-posting]]');
    try {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const payload = await api_1.default.topics.reply(req, Object.assign(Object.assign({}, req.body), { tid: req.params.tid }));
        await helpers_1.default.formatApiResponse(200, res, payload);
    }
    finally {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await database_1.default.deleteObjectField('locks', id);
    }
};
exports.reply = reply;
const del = async (req, res) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api_1.default.topics.delete(req, { tids: [req.params.tid] });
    await helpers_1.default.formatApiResponse(200, res);
};
exports.del = del;
exports.delete = exports.del;
const restore = async (req, res) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api_1.default.topics.restore(req, { tids: [req.params.tid] });
    await helpers_1.default.formatApiResponse(200, res);
};
exports.restore = restore;
const purge = async (req, res) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api_1.default.topics.purge(req, { tids: [req.params.tid] });
    await helpers_1.default.formatApiResponse(200, res);
};
exports.purge = purge;
const pin = async (req, res) => {
    // Pin expiry was not available w/ sockets hence not included in api lib method
    if (req.body.expiry) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await topics_1.default.tools.setPinExpiry(req.params.tid, req.body.expiry, req.uid);
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api_1.default.topics.pin(req, { tids: [req.params.tid] });
    await helpers_1.default.formatApiResponse(200, res);
};
exports.pin = pin;
const unpin = async (req, res) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api_1.default.topics.unpin(req, { tids: [req.params.tid] });
    await helpers_1.default.formatApiResponse(200, res);
};
exports.unpin = unpin;
const resolve = async (req, res) => {
    await api_1.default.topics.resolve(req, { tids: [req.params.tid] });
    await helpers_1.default.formatApiResponse(200, res);
};
exports.resolve = resolve;
const unresolve = async (req, res) => {
    await api_1.default.topics.unresolve(req, { tids: [req.params.tid] });
    await helpers_1.default.formatApiResponse(200, res);
};
exports.unresolve = unresolve;
const lock = async (req, res) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api_1.default.topics.lock(req, { tids: [req.params.tid] });
    await helpers_1.default.formatApiResponse(200, res);
};
exports.lock = lock;
const unlock = async (req, res) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api_1.default.topics.unlock(req, { tids: [req.params.tid] });
    await helpers_1.default.formatApiResponse(200, res);
};
exports.unlock = unlock;
const follow = async (req, res) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api_1.default.topics.follow(req, req.params);
    await helpers_1.default.formatApiResponse(200, res);
};
exports.follow = follow;
const ignore = async (req, res) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api_1.default.topics.ignore(req, req.params);
    await helpers_1.default.formatApiResponse(200, res);
};
exports.ignore = ignore;
const unfollow = async (req, res) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api_1.default.topics.unfollow(req, req.params);
    await helpers_1.default.formatApiResponse(200, res);
};
exports.unfollow = unfollow;
const addTags = async (req, res) => {
    if (!await privileges_1.default.topics.canEdit(req.params.tid, req.user.uid)) {
        return helpers_1.default.formatApiResponse(403, res);
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const cid = await topics_1.default.getTopicField(req.params.tid, 'cid');
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await topics_1.default.validateTags(req.body.tags, cid, req.user.uid, req.params.tid);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const tags = await topics_1.default.filterTags(req.body.tags);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await topics_1.default.addTags(tags, [req.params.tid]);
    await helpers_1.default.formatApiResponse(200, res);
};
exports.addTags = addTags;
const deleteTags = async (req, res) => {
    if (!await privileges_1.default.topics.canEdit(req.params.tid, req.user.uid)) {
        return helpers_1.default.formatApiResponse(403, res);
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await topics_1.default.deleteTopicTags(req.params.tid);
    await helpers_1.default.formatApiResponse(200, res);
};
exports.deleteTags = deleteTags;
const getThumbs = async (req, res) => {
    // post_uuids can be passed in occasionally, in that case no checks are necessary
    if (isFinite(parseInt(req.params.tid, 10))) {
        const [exists, canRead] = await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            topics_1.default.exists(req.params.tid),
            privileges_1.default.topics.can('topics:read', req.params.tid, req.uid),
        ]);
        if (!exists || !canRead) {
            return helpers_1.default.formatApiResponse(403, res);
        }
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await helpers_1.default.formatApiResponse(200, res, await topics_1.default.thumbs.get(req.params.tid));
};
exports.getThumbs = getThumbs;
async function checkThumbPrivileges({ tid, uid, res }) {
    // req.params.tid could be either a tid (pushing a new thumb to an existing topic)
    // or a post UUID (a new topic being composed)
    const isUUID = validator_1.default.isUUID(tid);
    // Sanity-check the tid if it's strictly not a uuid
    if (!isUUID && (isNaN(parseInt(tid, 10)) || !await topics_1.default.exists(tid))) {
        return helpers_1.default.formatApiResponse(404, res, new Error('[[error:no-topic]]'));
    }
    // While drafts are not protected, tids are
    if (!isUUID && !await privileges_1.default.topics.canEdit(tid, uid)) {
        return helpers_1.default.formatApiResponse(403, res, new Error('[[error:no-privileges]]'));
    }
}
const addThumb = async (req, res) => {
    await checkThumbPrivileges({ tid: req.params.tid, uid: req.user.uid, res });
    if (res.headersSent) {
        return;
    }
    const files = await uploads_1.default.uploadThumb(req, res); // response is handled here
    // Add uploaded files to topic zset
    if (files && files.length) {
        await Promise.all(files.map(async (fileObj) => {
            await topics_1.default.thumbs.associate({
                id: req.params.tid,
                path: fileObj.path || fileObj.url,
            });
        }));
    }
};
exports.addThumb = addThumb;
const migrateThumbs = async (req, res) => {
    await Promise.all([
        checkThumbPrivileges({ tid: req.params.tid, uid: req.user.uid, res }),
        checkThumbPrivileges({ tid: req.body.tid, uid: req.user.uid, res }),
    ]);
    if (res.headersSent) {
        return;
    }
    await topics_1.default.thumbs.migrate(req.params.tid, req.body.tid);
    await helpers_1.default.formatApiResponse(200, res);
};
exports.migrateThumbs = migrateThumbs;
const deleteThumb = async (req, res) => {
    if (!req.body.path.startsWith('http')) {
        middleware_1.default.assert.path(req, res, () => { console.log('complete'); });
        if (res.headersSent) {
            return;
        }
    }
    await checkThumbPrivileges({ tid: req.params.tid, uid: req.user.uid, res });
    if (res.headersSent) {
        return;
    }
    await topics_1.default.thumbs.delete(req.params.tid, req.body.path);
    await helpers_1.default.formatApiResponse(200, res, await topics_1.default.thumbs.get(req.params.tid));
};
exports.deleteThumb = deleteThumb;
const reorderThumbs = async (req, res) => {
    await checkThumbPrivileges({ tid: req.params.tid, uid: req.user.uid, res });
    if (res.headersSent) {
        return;
    }
    const exists = await topics_1.default.thumbs.exists(req.params.tid, req.body.path);
    if (!exists) {
        return helpers_1.default.formatApiResponse(404, res);
    }
    await topics_1.default.thumbs.associate({
        id: req.params.tid,
        path: req.body.path,
        score: req.body.order,
    });
    await helpers_1.default.formatApiResponse(200, res);
};
exports.reorderThumbs = reorderThumbs;
const getEvents = async (req, res) => {
    if (!await privileges_1.default.topics.can('topics:read', req.params.tid, req.uid)) {
        return helpers_1.default.formatApiResponse(403, res);
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await helpers_1.default.formatApiResponse(200, res, await topics_1.default.events.get(req.params.tid, req.uid));
};
exports.getEvents = getEvents;
const deleteEvent = async (req, res) => {
    if (!await privileges_1.default.topics.isAdminOrMod(req.params.tid, req.uid)) {
        return helpers_1.default.formatApiResponse(403, res);
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await topics_1.default.events.purge(req.params.tid, [req.params.eventId]);
    await helpers_1.default.formatApiResponse(200, res);
};
exports.deleteEvent = deleteEvent;
