"use strict";
// import db from '../database';
// import plugins from '../plugins';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const db = require("../database");
const plugins = require("../plugins");
var Action;
(function (Action) {
    Action[Action["RESOLVE"] = 0] = "RESOLVE";
    Action[Action["UNRESOLVE"] = 1] = "UNRESOLVE";
})(Action || (Action = {}));
function default_1(Posts) {
    function toggleResolve(type, pid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (parseInt(uid, 10) <= 0) {
                throw new Error('[[error:not-logged-in]]');
            }
            const isResolving = type === Action.RESOLVE;
            const [postData, hasResolved] = yield Promise.all([
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
                yield db.sortedSetAdd(`uid:${uid}:resolved`, Date.now(), pid);
            }
            else {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                yield db.sortedSetRemove(`uid:${uid}:resolved`, pid);
            }
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            yield db[isResolving ? 'setAdd' : 'setRemove'](`pid:${pid}:users_resolved`, uid);
            yield plugins.hooks.fire(`action:post.${type}`, {
                pid: pid,
                uid: uid,
                owner: postData.uid,
                current: hasResolved ? 'resolved' : 'unresolved',
            });
            return {
                post: postData,
                isResolved: isResolving,
            };
        });
    }
    Posts.hasResolved = function (pid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (parseInt(uid, 10) <= 0) {
                return Array.isArray(pid) ? pid.map(() => false) : false;
            }
            if (Array.isArray(pid)) {
                const sets = pid.map(pid => `pid:${pid}:users_resolved`);
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                return yield db.isMemberOfSets(sets, uid);
            }
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return yield db.isSetMember(`pid:${pid}:users_resolved`, uid);
        });
    };
    Posts.resolve = function (pid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield toggleResolve(Action.RESOLVE, pid, uid);
        });
    };
    Posts.unresolve = function (pid, uid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield toggleResolve(Action.UNRESOLVE, pid, uid);
        });
    };
}
exports.default = default_1;
