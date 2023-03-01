"use strict";
// import db from '../database';
// import plugins from '../plugins';
Object.defineProperty(exports, "__esModule", { value: true });
const db = require("../database");
const plugins = require("../plugins");
var Action;
(function (Action) {
    Action[Action["RESOLVE"] = 0] = "RESOLVE";
    Action[Action["UNRESOLVE"] = 1] = "UNRESOLVE";
})(Action || (Action = {}));
function default_1(Posts) {
    async function toggleResolve(type, pid, uid) {
        if (parseInt(uid, 10) <= 0) {
            throw new Error('[[error:not-logged-in]]');
        }
        const isResolving = type === Action.RESOLVE;
        const [postData, hasResolved] = await Promise.all([
            Posts.getPostFields(pid, ['pid', 'uid']),
            Posts.hasResolved(pid, uid),
        ]);
        if (isResolving && hasResolved) {
            throw new Error('[[error:already-resolved]]');
        }
        if (!isResolving && !hasResolved) {
            throw new Error('[[error:already-unresolved]]');
        }
        if (isResolving) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            await db.sortedSetAdd(`uid:${uid}:resolved`, Date.now(), pid);
        }
        else {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            await db.sortedSetRemove(`uid:${uid}:resolved`, pid);
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await db[isResolving ? 'setAdd' : 'setRemove'](`pid:${pid}:users_resolved`, uid);
        await plugins.hooks.fire(`action:post.${type}`, {
            pid: pid,
            uid: uid,
            owner: postData.uid,
            current: hasResolved ? 'resolved' : 'unresolved',
        });
        return {
            post: postData,
            isResolved: isResolving,
        };
    }
    Posts.hasResolved = async function (pid, uid) {
        if (parseInt(uid, 10) <= 0) {
            return Array.isArray(pid) ? pid.map(() => false) : false;
        }
        if (Array.isArray(pid)) {
            const sets = pid.map(pid => `pid:${pid}:users_resolved`);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return await db.isMemberOfSets(sets, uid);
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await db.isSetMember(`pid:${pid}:users_resolved`, uid);
    };
    Posts.resolve = async function (pid, uid) {
        return await toggleResolve(Action.RESOLVE, pid, uid);
    };
    Posts.unresolve = async function (pid, uid) {
        return await toggleResolve(Action.UNRESOLVE, pid, uid);
    };
}
exports.default = default_1;
