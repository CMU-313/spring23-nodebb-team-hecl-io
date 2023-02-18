// import db from '../database';
// import plugins from '../plugins';

import db = require('../database');
import plugins = require('../plugins');


interface PostData {
  pid: number,
  uid: number
}

interface ToggleData {
  post: PostData,
  isResolved: boolean
}

enum Action {
  RESOLVE,
  UNRESOLVE
}

interface PostsType {
  getPostFields(pid: string, fields: string[]): Promise<PostData>,
  hasResolved(pid: string | Array<string>, uid: string): Promise<boolean | boolean[]>
  resolve(pid: string, uid: string): Promise<ToggleData>,
  unresolve(pid: string, uid: string): Promise<ToggleData>,
}

export default function (Posts: PostsType) {
    async function toggleResolve(type: Action, pid: string, uid: string) {
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
        } else {
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

    Posts.hasResolved = async function (pid: string | Array<string>, uid: string) {
        if (parseInt(uid, 10) <= 0) {
            return Array.isArray(pid) ? pid.map(() => false) : false;
        }

        if (Array.isArray(pid)) {
            const sets = pid.map(pid => `pid:${pid}:users_resolved`);
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return await db.isMemberOfSets(sets, uid) as boolean[];
        }
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await db.isSetMember(`pid:${pid}:users_resolved`, uid) as boolean;
    };

    Posts.resolve = async function (pid: string, uid: string) {
        return await toggleResolve(Action.RESOLVE, pid, uid);
    };

    Posts.unresolve = async function (pid: string, uid: string) {
        return await toggleResolve(Action.UNRESOLVE, pid, uid);
    };
}
