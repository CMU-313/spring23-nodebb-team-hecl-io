"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = exports.removeListeners = void 0;
const benchpress_1 = __importDefault(require("benchpress"));
const nconf_1 = __importDefault(require("nconf"));
const socket_io_client_1 = require("socket.io-client");
const replies_1 = __importDefault(require("./replies"));
const posts_1 = __importDefault(require("./posts"));
const images_1 = __importDefault(require("./images"));
const components_1 = __importDefault(require("../../modules/components"));
const translator_1 = __importDefault(require("../../modules/translator"));
const hooks_1 = __importDefault(require("../../modules/hooks"));
const app_1 = __importDefault(require("../../app"));
const ajaxify_1 = __importDefault(require("../../ajaxify"));
const utils_1 = __importDefault(require("../../utils"));
const postTools_1 = __importDefault(require("./postTools"));
const threadTools_1 = __importDefault(require("./threadTools"));
// interface ServerToClientEvents {
//     noArg: () => void;
//     basicEmit: (a: number, b: string, c: Buffer) => void;
//     withAck: (d: string, callback: (e: number) => void) => void;
//   }
// interface ClientToServerEvents {
//     hello: () => void;
// }
// interface InterServerEvents {
//     ping: () => void;
// }
// interface SocketData {
//     name: string;
//     age: number;
// }
// const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();
const socket = (0, socket_io_client_1.io)();
function onUserStatusChange(data) {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    app_1.default.updateUserStatus($('[data-uid="' + data.uid + '"] [component="user/status"]'), data.status);
}
function updatePostVotesAndUserReputation(data) {
    const votes = $('[data-pid="' + data.post.pid + '"] [component="post/vote-count"]').filter(function (index, el) {
        return parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10);
    });
    const reputationElements = $('.reputation[data-uid="' + data.post.uid + '"]');
    votes.html(data.post.votes).attr('data-votes', data.post.votes);
    reputationElements.html(data.user.reputation).attr('data-reputation', data.user.reputation);
}
function updateBookmarkCount(data) {
    $('[data-pid="' + data.post.pid + '"] .bookmarkCount').filter(function (index, el) {
        return parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10);
    }).html(data.post.bookmarks).attr('data-bookmarks', data.post.bookmarks);
}
function onTopicPurged(data) {
    if (ajaxify_1.default.data.category &&
        ajaxify_1.default.data.category.slug &&
        parseInt(data.tid, 10) === parseInt(ajaxify_1.default.data.tid, 10)) {
        ajaxify_1.default.go('category/' + ajaxify_1.default.data.category.slug, null, true);
    }
}
function onTopicMoved(data) {
    if (data && data.slug && parseInt(data.tid, 10) === parseInt(ajaxify_1.default.data.tid, 10)) {
        ajaxify_1.default.go('topic/' + data.slug, null, true);
    }
}
function onPostEdited(data) {
    if (!data || !data.post || parseInt(data.post.tid, 10) !== parseInt(ajaxify_1.default.data.tid, 10)) {
        return;
    }
    const editedPostEl = components_1.default.get('post/content', data.post.pid).filter(function (index, el) {
        return parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10);
    });
    const editorEl = $('[data-pid="' + data.post.pid + '"] [component="post/editor"]').filter(function (index, el) {
        return parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10);
    });
    const topicTitle = components_1.default.get('topic/title');
    const navbarTitle = components_1.default.get('navbar/title').find('span');
    const breadCrumb = components_1.default.get('breadcrumb/current');
    if (data.topic.rescheduled) {
        return ajaxify_1.default.go('topic/' + data.topic.slug, null, true);
    }
    if (topicTitle.length && data.topic.title && data.topic.renamed) {
        ajaxify_1.default.data.title = data.topic.title;
        const newUrl = 'topic/' + data.topic.slug + (window.location.search ? window.location.search : '');
        history.replaceState({ url: newUrl }, null, window.location.protocol + '//' + window.location.host + nconf_1.default.get('relative_path') + '/' + newUrl);
        topicTitle.fadeOut(250, function () {
            topicTitle.html(data.topic.title).fadeIn(250);
        });
        breadCrumb.fadeOut(250, function () {
            breadCrumb.html(data.topic.title).fadeIn(250);
        });
        navbarTitle.fadeOut(250, function () {
            navbarTitle.html(data.topic.title).fadeIn(250);
        });
    }
    if (data.post.changed) {
        editedPostEl.fadeOut(250, function () {
            editedPostEl.html(translator_1.default.unescape(data.post.content));
            editedPostEl.find('img:not(.not-responsive)').addClass('img-responsive');
            images_1.default.wrapImagesInLinks(editedPostEl.parent());
            posts_1.default.addBlockquoteEllipses(editedPostEl.parent());
            editedPostEl.fadeIn(250);
            const editData = {
                editor: data.editor,
                editedISO: utils_1.default.toISOString(data.post.edited),
            };
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            app_1.default.parseAndTranslate('partials/topic/post-editor', editData, function (html) {
                editorEl.replaceWith(html);
                $('[data-pid="' + data.post.pid + '"] [component="post/editor"] .timeago').timeago();
                hooks_1.default.fire('action:posts.edited', data);
            });
        });
    }
    else {
        hooks_1.default.fire('action:posts.edited', data);
    }
    if (data.topic.tags && data.topic.tagsupdated) {
        benchpress_1.default.render('partials/topic/tags', { tags: data.topic.tags }).then(function (html) {
            const tags = $('.tags');
            tags.fadeOut(250, function () {
                tags.html(html).fadeIn(250);
            });
        });
    }
    postTools_1.default.removeMenu(components_1.default.get('post', 'pid', data.post.pid));
}
function onPostPurged(postData) {
    if (!postData || parseInt(postData.tid, 10) !== parseInt(ajaxify_1.default.data.tid, 10)) {
        return;
    }
    components_1.default.get('post', 'pid', postData.pid).fadeOut(500, function () {
        $(this).remove();
        posts_1.default.showBottomPostBar();
    });
    ajaxify_1.default.data.postcount -= 1;
    postTools_1.default.updatePostCount(ajaxify_1.default.data.postcount);
    replies_1.default.onPostPurged(postData);
}
function togglePostDeleteState(data) {
    const postEl = components_1.default.get('post', 'pid', data.pid);
    if (!postEl.length) {
        return;
    }
    postEl.toggleClass('deleted');
    const isDeleted = postEl.hasClass('deleted');
    postTools_1.default.toggle(data.pid, isDeleted);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    if (!ajaxify_1.default.data.privileges.isAdminOrMod && parseInt(data.uid, 10) !== parseInt(app_1.default.user.uid, 10)) {
        postEl.find('[component="post/tools"]').toggleClass('hidden', isDeleted);
        if (isDeleted) {
            postEl.find('[component="post/content"]').translateHtml('[[topic:post_is_deleted]]');
        }
        else {
            postEl.find('[component="post/content"]').html(translator_1.default.unescape(data.content));
        }
    }
}
function togglePostBookmark(data) {
    const el = $('[data-pid="' + data.post.pid + '"] [component="post/bookmark"]').filter(function (index, el) {
        return parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10);
    });
    if (!el.length) {
        return;
    }
    el.attr('data-bookmarked', data.isBookmarked);
    el.find('[component="post/bookmark/on"]').toggleClass('hidden', !data.isBookmarked);
    el.find('[component="post/bookmark/off"]').toggleClass('hidden', data.isBookmarked);
}
function togglePostVote(data) {
    const post = $('[data-pid="' + data.post.pid + '"]');
    post.find('[component="post/upvote"]').filter(function (index, el) {
        return parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10);
    }).toggleClass('upvoted', data.upvote);
    post.find('[component="post/downvote"]').filter(function (index, el) {
        return parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10);
    }).toggleClass('downvoted', data.downvote);
}
function onNewNotification(data) {
    const tid = ajaxify_1.default.data.tid;
    if (data && data.tid && parseInt(data.tid, 10) === parseInt(tid, 10)) {
        socket.emit('topics.markTopicNotificationsRead', [tid]);
    }
}
const events = {
    'event:user_status_change': onUserStatusChange,
    'event:voted': updatePostVotesAndUserReputation,
    'event:bookmarked': updateBookmarkCount,
    // 'event:resolved': updateResolved,
    'event:topic_deleted': threadTools_1.default.setDeleteState,
    'event:topic_restored': threadTools_1.default.setDeleteState,
    'event:topic_purged': onTopicPurged,
    'event:topic_locked': threadTools_1.default.setLockedState,
    'event:topic_unlocked': threadTools_1.default.setLockedState,
    'event:topic_pinned': threadTools_1.default.setPinnedState,
    'event:topic_unpinned': threadTools_1.default.setPinnedState,
    'event:topic_resolved': threadTools_1.default.setResolvedState,
    'event:topic_unresolved': threadTools_1.default.setResolvedState,
    'event:topic_moved': onTopicMoved,
    'event:post_edited': onPostEdited,
    'event:post_purged': onPostPurged,
    'event:post_deleted': togglePostDeleteState,
    'event:post_restored': togglePostDeleteState,
    'posts.bookmark': togglePostBookmark,
    'posts.unbookmark': togglePostBookmark,
    'posts.upvote': togglePostVote,
    'posts.downvote': togglePostVote,
    'posts.unvote': togglePostVote,
    'event:new_notification': onNewNotification,
    'event:new_post': posts_1.default.onNewPost,
};
// define('forum/topic/events', [
//     'forum/topic/postTools',
//     'forum/topic/threadTools',
//     'forum/topic/posts',
//     'forum/topic/images',
//     'components',
//     'translator',
//     'benchpress',
//     'hooks',
// ], function (postTools, threadTools, posts, images, components, translator, Benchpress, hooks) {
// const Events = {};
function removeListeners() {
    return __awaiter(this, void 0, void 0, function* () {
        for (const eventName in events) {
            if (events.hasOwnProperty(eventName)) {
                socket.removeListener(eventName, events[eventName]);
            }
        }
    });
}
exports.removeListeners = removeListeners;
;
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        removeListeners();
        for (const eventName in events) {
            if (events.hasOwnProperty(eventName)) {
                socket.on(eventName, events[eventName]);
            }
        }
    });
}
exports.init = init;
;
// return Events;
// });
