import Benchpress from 'benchpressjs/build/benchpress';
import postTools from './postTools';
import threadTools from './threadTools';
import posts from './posts';
import images from './images';
import components from '../../modules/components';
import translator from '../../modules/translator';
import hooks from '../../modules/hooks';
import socket from '../../sockets';
import app from '../../app';
import ajaxify from '../../ajaxify';
import utils from '../../utils.common';
import replies from './replies';
import config from '../../../../src/controllers/api';

declare var $;

interface Topic {
    tid: string;
    slug: string;
    title: string;
    renamed?: boolean;
    rescheduled?: boolean;
    tags?: string[];
    tagsupdated?: boolean;
}

interface Post {
    pid: string;
    tid: string;
    uid: string;
    content: string;
    changed?: boolean;
    edited?: string;
    bookmarks: unknown;
    votes: unknown;
}

interface Data {
    tid: string;
    uid: string;
    status: string;
    post: Post;
    topic: Topic;
    editor: unknown;
    slug: unknown;
    user: {reputation: unknown};
}

interface IEventObject {
  [eventName: string]: (...args: unknown[]) => void;
}

interface IEvents {
  init: () => void;
  removeListeners: () => void;
}

/* eslint-disable*/

const Events: IEvents = {
    init: function (): void {
        Events.removeListeners();
        for (const eventName in events) {
            if (events.hasOwnProperty(eventName)) {
                socket.on(eventName, events[eventName]);
            }
        }
    },
    removeListeners: function (): void {
        for (const eventName in events) {
            if (events.hasOwnProperty(eventName)) {
                socket.removeListener(eventName, events[eventName]);
            }
        }
    },
};

const events: IEventObject = {
    'event:user_status_change': onUserStatusChange,
    'event:voted': updatePostVotesAndUserReputation,
    'event:bookmarked': updateBookmarkCount,

    'event:topic_deleted': threadTools.setDeleteState,
    'event:topic_restored': threadTools.setDeleteState,
    'event:topic_purged': onTopicPurged,

    'event:topic_locked': threadTools.setLockedState,
    'event:topic_unlocked': threadTools.setLockedState,

    'event:topic_pinned': threadTools.setPinnedState,
    'event:topic_unpinned': threadTools.setPinnedState,

    'event:topic_resolved': threadTools.setResolvedState,
    'event:topic_unresolved': threadTools.setResolvedState,

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
    'event:new_post': posts.onNewPost,
};

function onUserStatusChange(data: Data): void {
    app.updateUserStatus($('[data-uid="' + data.uid + '"] [component="user/status"]'), data.status);
}

function updatePostVotesAndUserReputation(data: Data): void {
    const votes = $('[data-pid="' + data.post.pid + '"] [component="post/vote-count"]').filter(function (index, el) {
        return parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10);
    });
    const reputationElements = $('.reputation[data-uid="' + data.post.uid + '"]');
    votes.html(data.post.votes).attr('data-votes', data.post.votes);
    reputationElements.html(data.user.reputation).attr('data-reputation', data.user.reputation);
}

function updateBookmarkCount(data: Data): void {
    $('[data-pid="' + data.post.pid + '"] .bookmarkCount').filter(function (index, el) {
        return parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10);
    }).html(data.post.bookmarks).attr('data-bookmarks', data.post.bookmarks);
}

function onTopicPurged(data: Data): void {
    if (
        ajaxify.data.category &&
        ajaxify.data.category.slug &&
        parseInt(data.tid, 10) === parseInt(ajaxify.data.tid, 10)
    ) {
        ajaxify.go(`category/${ajaxify.data.category.slug}`, null, true);
    }
}

function onTopicMoved(data: Data): void {
    if (data && data.slug && parseInt(data.tid, 10) === parseInt(ajaxify.data.tid, 10)) {
        ajaxify.go(`topic/${data.slug}`, null, true);
    }
}

function onPostEdited(data: Data): void {
    if (!data?.post || parseInt(data.post.tid, 10) !== parseInt(ajaxify.data.tid, 10)) {
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

    if (data.topic?.rescheduled) {
        return ajaxify.go('topic/' + data.topic.slug, null, true);
    }

    if (topicTitle.length && data.topic.title && data.topic.renamed) {
        ajaxify.data.title = data.topic.title;
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
            images.wrapImagesInLinks(editedPostEl.parent());
            posts.addBlockquoteEllipses(editedPostEl.parent());
            editedPostEl.fadeIn(250);

            const editData: Record<string, any> = {
                editor: data.editor,
                editedISO: utils.toISOString(data.post.edited),
            };

            app.parseAndTranslate('partials/topic/post-editor', editData, function (html: string) {
                editorEl.replaceWith(html);
                const timeagoEL = $('[data-pid="' + data.post.pid + '"] [component="post/editor"] .timeago');
                timeagoEL.timeago();
                hooks.fire('action:posts.edited', data);
            });
        });
    } else {
        hooks.fire('action:posts.edited', data);
    }

    if (data.topic.tags && data.topic.tagsupdated) {
        Benchpress.render('partials/topic/tags', { tags: data.topic.tags }).then(function (html) {
            const tags = $('.tags');

            tags.fadeOut(250, function () {
                tags.html(html).fadeIn(250);
            });
        });
    }

    postTools.removeMenu(components.get('post', 'pid', data.post.pid));
}

function onPostPurged(postData: Post) {
    if (!postData || parseInt(postData.tid, 10) !== parseInt(ajaxify.data.tid, 10)) {
        return;
    }
    components.get('post', 'pid', postData.pid).fadeOut(500, function () {
        $(this).remove();
        posts.showBottomPostBar();
    });
    ajaxify.data.postcount -= 1;
    postTools.updatePostCount(ajaxify.data.postcount);
    replies.onPostPurged(postData);
}

function togglePostDeleteState(data: Post) {
    const postEl = components.get('post', 'pid', data.pid);

    if (!postEl.length) {
        return;
    }

    postEl.toggleClass('deleted');
    const isDeleted = postEl.hasClass('deleted');
    postTools.toggle(data.pid, isDeleted);

    if (!ajaxify.data.privileges.isAdminOrMod && parseInt(data.uid, 10) !== parseInt(app.user.uid, 10)) {
        postEl.find('[component="post/tools"]').toggleClass('hidden', isDeleted);
        if (isDeleted) {
            postEl.find('[component="post/content"]').translateHtml('[[topic:post_is_deleted]]');
        } else {
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
    const tid = ajaxify.data.tid;
    if (data && data.tid && parseInt(data.tid, 10) === parseInt(tid, 10)) {
        socket.emit('topics.markTopicNotificationsRead', [tid]);
    }
}