"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const benchpress_1 = __importDefault(require("benchpressjs/build/benchpress"));
const postTools_1 = __importDefault(require("./postTools"));
const threadTools_1 = __importDefault(require("./threadTools"));
const posts_1 = __importDefault(require("./posts"));
const images_1 = __importDefault(require("./images"));
const hooks_1 = __importDefault(require("../../modules/hooks"));
const sockets_1 = __importDefault(require("../../sockets"));
const app_1 = __importDefault(require("../../app"));
const ajaxify_1 = __importDefault(require("../../ajaxify"));
const utils_common_1 = __importDefault(require("../../utils.common"));
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
function updateEndorsed(data) {
    $('[data-pid="' + data.post.pid + '"] .endorseBtn').filter(function (index, el) {
        return parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10);
    }).html(data.isEndorsed ? 'Unendorse' : 'Endorse').attr('data-endorsed', data.isEndorsed);
}
function onTopicPurged(data) {
    if (
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    ajaxify_1.default.data.category && ajaxify_1.default.data.category.slug &&
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
        parseInt(data.tid, 10) === parseInt(ajaxify_1.default.data.tid, 10)) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line
        ajaxify_1.default.go(`category/${ajaxify_1.default.data.category.slug}`, null, true);
    }
}
function onTopicMoved(data) {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
    if (data && data.slug && parseInt(data.tid, 10) === parseInt(ajaxify_1.default.data.tid, 10)) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions
        ajaxify_1.default.go(`topic/${data.slug}`, null, true);
    }
}
function onPostEdited(data) {
    var _a;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
    if (!(data === null || data === void 0 ? void 0 : data.post) || parseInt(data.post.tid, 10) !== parseInt(ajaxify_1.default.data.tid, 10)) {
        return;
    }
    const editedPostEl = components
        .get('post/content', 'pid', data.post.pid)
        .filter((index, el) => parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10));
    const editorEl = $(`[data-pid="${data.post.pid}"] [component="post/editor"]`)
        .filter((index, el) => parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10));
    const topicTitle = components.get('topic/title');
    const navbarTitle = components.get('navbar/title').find('span');
    const breadCrumb = components.get('breadcrumb/current');
    if ((_a = data.topic) === null || _a === void 0 ? void 0 : _a.rescheduled) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        ajaxify_1.default.go('topic/' + data.topic.slug, null, true);
        return;
    }
    if (topicTitle.length && data.topic.title && data.topic.renamed) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        ajaxify_1.default.data.title = data.topic.title;
        const newUrl = 'topic/' + data.topic.slug + (window.location.search ? window.location.search : '');
        history.replaceState({ url: newUrl }, null, window.location.protocol + '//' + window.location.host + config.relative_path + '/' + newUrl);
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
            editedPostEl.html(translator.unescape(data.post.content));
            editedPostEl.find('img:not(.not-responsive)').addClass('img-responsive');
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            images_1.default.wrapImagesInLinks(editedPostEl.parent());
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            posts_1.default.addBlockquoteEllipses(editedPostEl.parent());
            editedPostEl.fadeIn(250);
            const editData = {
                editor: data.editor,
                editedISO: utils_common_1.default.toISOString(data.post.edited),
            };
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            app_1.default.parseAndTranslate('partials/topic/post-editor', editData, function (html) {
                editorEl.replaceWith(html);
                const timeagoEL = $('[data-pid="' + data.post.pid + '"] [component="post/editor"] .timeago');
                timeagoEL.timeago();
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line max-len
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                hooks_1.default.fire('action:posts.edited', data);
            });
        });
    }
    else {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        hooks_1.default.fire('action:posts.edited', data);
    }
    if (data.topic.tags && data.topic.tagsupdated) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        benchpress_1.default.render('partials/topic/tags', { tags: data.topic.tags }).then(function (html) {
            const tags = $('.tags');
            tags.fadeOut(250, function () {
                tags.html(html).fadeIn(250);
            });
        });
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    postTools_1.default.removeMenu(components.get('post', 'pid', data.post.pid));
}
function onPostPurged(postData) {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const tid = ajaxify_1.default.data.tid;
    if (!postData || parseInt(postData.tid, 10) !== parseInt(tid, 10)) {
        return;
    }
    components.get('post', 'pid', postData.pid).fadeOut(500, function () {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        $(this).remove();
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        posts_1.default.showBottomPostBar();
    });
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    ajaxify_1.default.data.postcount -= 1;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    postTools_1.default.updatePostCount(ajaxify_1.default.data.postcount);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    replies.onPostPurged(postData);
}
function togglePostDeleteState(data) {
    const postEl = components.get('post', 'pid', data.pid);
    if (!postEl.length) {
        return;
    }
    postEl.toggleClass('deleted');
    const isDeleted = postEl.hasClass('deleted');
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    postTools_1.default.toggle(data.pid, isDeleted);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
    if (!ajaxify_1.default.data.privileges.isAdminOrMod && parseInt(data.uid, 10) !== parseInt(app_1.default.user.uid, 10)) {
        postEl.find('[component="post/tools"]').toggleClass('hidden', isDeleted);
        if (isDeleted) {
            postEl.find('[component="post/content"]').translateHtml('[[topic:post_is_deleted]]');
        }
        else {
            postEl.find('[component="post/content"]').html(translator.unescape(data.content));
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
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const tid = ajaxify_1.default.data.tid;
    if (data && data.tid && parseInt(data.tid, 10) === parseInt(tid, 10)) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        sockets_1.default.emit('topics.markTopicNotificationsRead', [tid]);
    }
}
const events = {
    'event:user_status_change': onUserStatusChange,
    'event:voted': updatePostVotesAndUserReputation,
    'event:bookmarked': updateBookmarkCount,
    'event:endorsed': updateEndorsed,
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    'event:topic_deleted': threadTools_1.default.setDeleteState,
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    'event:topic_restored': threadTools_1.default.setDeleteState,
    'event:topic_purged': onTopicPurged,
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    'event:topic_locked': threadTools_1.default.setLockedState,
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    'event:topic_unlocked': threadTools_1.default.setLockedState,
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    'event:topic_pinned': threadTools_1.default.setPinnedState,
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    'event:topic_unpinned': threadTools_1.default.setPinnedState,
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    'event:topic_resolved': threadTools_1.default.setResolvedState,
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
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
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    'event:new_post': posts_1.default.onNewPost,
};
const Events = {
    init: function () {
        Events.removeListeners();
        for (const eventName in events) {
            if (events.hasOwnProperty(eventName)) {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line max-len
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                sockets_1.default.on(eventName, events[eventName]);
            }
        }
    },
    removeListeners: function () {
        for (const eventName in events) {
            if (events.hasOwnProperty(eventName)) {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line max-len
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                sockets_1.default.removeListener(eventName, events[eventName]);
            }
        }
    },
};
