import validator from 'validator';
import { Request, Response } from 'express';

import db from '../../database';
import api from '../../api';
import topics from '../../topics';
import privileges from '../../privileges';

import helpers from '../helpers';
import middleware from '../../middleware';
import uploadsController from '../uploads';

import { TagObject } from '../../types';

interface Validator { isUUID: (str: string, version?: validator.UUIDVersion) => boolean; }
interface ExtendedRequest extends Request {
    uid: number;
    sessionID: number;
    user?: {
        uid: number
    };
    body: {
        expiry: boolean;
        tags: TagObject[];
        path: string;
        tid: string | number;
        order: number;
    }
}

interface Payload {
    queued: boolean;
}

interface File {
    name: string;
    path: string;
    url: string;
    fileCount: number;
    size: number;
    sizeHumanReadable: string;
    isDirectory: boolean;
    isFile: boolean;
    mtime: number;
}

export const get = async (req: ExtendedRequest, res: Response) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await helpers.formatApiResponse(200, res, await api.topics.get(req, req.params));
};

async function lockPosting(req: ExtendedRequest, error: string) {
    const id = req.uid > 0 ? req.uid : req.sessionID;
    const value = `posting${id}`;

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const count = await db.incrObjectField('locks', value) as number;
    if (count > 1) {
        throw new Error(error);
    }
    return value;
}

export const create = async (req: ExtendedRequest, res: Response) => {
    const id = await lockPosting(req, '[[error:already-posting]]');
    try {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const payload = await api.topics.create(req, req.body) as Payload;
        if (payload.queued) {
            await helpers.formatApiResponse(202, res, payload);
        } else {
            await helpers.formatApiResponse(200, res, payload);
        }
    } finally {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await db.deleteObjectField('locks', id);
    }
};

export const reply = async (req: ExtendedRequest, res: Response) => {
    const id = await lockPosting(req, '[[error:already-posting]]');
    try {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const payload = await api.topics.reply(req, { ...req.body, tid: req.params.tid }) as Payload;
        await helpers.formatApiResponse(200, res, payload);
    } finally {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await db.deleteObjectField('locks', id);
    }
};

export const del = async (req: ExtendedRequest, res: Response) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api.topics.delete(req, { tids: [req.params.tid] });
    await helpers.formatApiResponse(200, res);
};

export { del as delete };

export const restore = async (req: ExtendedRequest, res: Response) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api.topics.restore(req, { tids: [req.params.tid] });

    await helpers.formatApiResponse(200, res);
};

export const purge = async (req: ExtendedRequest, res: Response) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api.topics.purge(req, { tids: [req.params.tid] });
    await helpers.formatApiResponse(200, res);
};

export const pin = async (req: ExtendedRequest, res: Response) => {
    // Pin expiry was not available w/ sockets hence not included in api lib method
    if (req.body.expiry) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await topics.tools.setPinExpiry(req.params.tid, req.body.expiry, req.uid);
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api.topics.pin(req, { tids: [req.params.tid] });

    await helpers.formatApiResponse(200, res);
};

export const unpin = async (req: ExtendedRequest, res: Response) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api.topics.unpin(req, { tids: [req.params.tid] });
    await helpers.formatApiResponse(200, res);
};

export const resolve = async (req: ExtendedRequest, res: Response) => {
    await api.topics.resolve(req, { tids: [req.params.tid] });
    await helpers.formatApiResponse(200, res);
};

export const unresolve = async (req: ExtendedRequest, res: Response) => {
    await api.topics.unresolve(req, { tids: [req.params.tid] });
    await helpers.formatApiResponse(200, res);
};

export const lock = async (req: ExtendedRequest, res: Response) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api.topics.lock(req, { tids: [req.params.tid] });
    await helpers.formatApiResponse(200, res);
};

export const unlock = async (req: ExtendedRequest, res: Response) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api.topics.unlock(req, { tids: [req.params.tid] });
    await helpers.formatApiResponse(200, res);
};

export const follow = async (req: ExtendedRequest, res: Response) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api.topics.follow(req, req.params);
    await helpers.formatApiResponse(200, res);
};

export const ignore = async (req: ExtendedRequest, res: Response) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api.topics.ignore(req, req.params);
    await helpers.formatApiResponse(200, res);
};

export const unfollow = async (req: ExtendedRequest, res: Response) => {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await api.topics.unfollow(req, req.params);
    await helpers.formatApiResponse(200, res);
};

export const addTags = async (req: ExtendedRequest, res: Response) => {
    if (!await privileges.topics.canEdit(req.params.tid, req.user.uid)) {
        return helpers.formatApiResponse(403, res);
    }

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const cid = await topics.getTopicField(req.params.tid, 'cid') as number;

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await topics.validateTags(req.body.tags, cid, req.user.uid, req.params.tid);

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const tags = await topics.filterTags(req.body.tags) as TagObject[];

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await topics.addTags(tags, [req.params.tid]);
    await helpers.formatApiResponse(200, res);
};

export const deleteTags = async (req: ExtendedRequest, res: Response) => {
    if (!await privileges.topics.canEdit(req.params.tid, req.user.uid)) {
        return helpers.formatApiResponse(403, res);
    }

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await topics.deleteTopicTags(req.params.tid);
    await helpers.formatApiResponse(200, res);
};

export const getThumbs = async (req: ExtendedRequest, res: Response) => {
    // post_uuids can be passed in occasionally, in that case no checks are necessary
    if (isFinite(parseInt(req.params.tid, 10))) {
        const [exists, canRead] = await Promise.all([
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            topics.exists(req.params.tid),
            privileges.topics.can('topics:read', req.params.tid, req.uid),
        ]) as boolean[];
        if (!exists || !canRead) {
            return helpers.formatApiResponse(403, res);
        }
    }

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await helpers.formatApiResponse(200, res, await topics.thumbs.get(req.params.tid));
};

async function checkThumbPrivileges({ tid, uid, res }: { tid: string, uid: number, res: Response }) {
    // req.params.tid could be either a tid (pushing a new thumb to an existing topic)
    // or a post UUID (a new topic being composed)
    const isUUID = (validator as Validator).isUUID(tid);

    // Sanity-check the tid if it's strictly not a uuid
    if (!isUUID && (isNaN(parseInt(tid, 10)) || !await topics.exists(tid))) {
        return helpers.formatApiResponse(404, res, new Error('[[error:no-topic]]'));
    }

    // While drafts are not protected, tids are
    if (!isUUID && !await privileges.topics.canEdit(tid, uid)) {
        return helpers.formatApiResponse(403, res, new Error('[[error:no-privileges]]'));
    }
}

export const addThumb = async (req: ExtendedRequest, res: Response) => {
    await checkThumbPrivileges({ tid: req.params.tid, uid: req.user.uid, res });
    if (res.headersSent) {
        return;
    }

    const files = await uploadsController.uploadThumb(req, res) as File[]; // response is handled here

    // Add uploaded files to topic zset
    if (files && files.length) {
        await Promise.all(files.map(async (fileObj) => {
            await topics.thumbs.associate({
                id: req.params.tid,
                path: fileObj.path || fileObj.url,
            });
        }));
    }
};

export const migrateThumbs = async (req: ExtendedRequest, res: Response) => {
    await Promise.all([
        checkThumbPrivileges({ tid: req.params.tid, uid: req.user.uid, res }),
        checkThumbPrivileges({ tid: req.body.tid as string, uid: req.user.uid, res }),
    ]);
    if (res.headersSent) {
        return;
    }

    await topics.thumbs.migrate(req.params.tid, req.body.tid);
    await helpers.formatApiResponse(200, res);
};

export const deleteThumb = async (req: ExtendedRequest, res: Response) => {
    if (!req.body.path.startsWith('http')) {
        middleware.assert.path(req, res, () => { console.log('complete'); });
        if (res.headersSent) {
            return;
        }
    }

    await checkThumbPrivileges({ tid: req.params.tid, uid: req.user.uid, res });
    if (res.headersSent) {
        return;
    }

    await topics.thumbs.delete(req.params.tid, req.body.path);
    await helpers.formatApiResponse(200, res, await topics.thumbs.get(req.params.tid));
};

export const reorderThumbs = async (req: ExtendedRequest, res: Response) => {
    await checkThumbPrivileges({ tid: req.params.tid, uid: req.user.uid, res });
    if (res.headersSent) {
        return;
    }

    const exists = await topics.thumbs.exists(req.params.tid, req.body.path) as boolean;
    if (!exists) {
        return helpers.formatApiResponse(404, res);
    }

    await topics.thumbs.associate({
        id: req.params.tid,
        path: req.body.path,
        score: req.body.order,
    });
    await helpers.formatApiResponse(200, res);
};

export const getEvents = async (req: ExtendedRequest, res: Response) => {
    if (!await privileges.topics.can('topics:read', req.params.tid, req.uid)) {
        return helpers.formatApiResponse(403, res);
    }

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await helpers.formatApiResponse(200, res, await topics.events.get(req.params.tid, req.uid));
};

export const deleteEvent = async (req: ExtendedRequest, res: Response) => {
    if (!await privileges.topics.isAdminOrMod(req.params.tid, req.uid)) {
        return helpers.formatApiResponse(403, res);
    }

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await topics.events.purge(req.params.tid, [req.params.eventId]);

    await helpers.formatApiResponse(200, res);
};
