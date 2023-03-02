import Benchpress from 'benchpressjs/build/benchpress';
import $ from 'jquery';
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

type filterFunctionType = (arg0: number, arg1: string) => boolean;

type timestampType = { data: (arg0: string, arg1: null) => { timeago: () => void; }; };

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
    bookmarks: number;
    votes: number;
    toPid: string;
    timestampISO: number;
    user: string;
}

interface Data {
    tid: string;
    uid: string;
    status: string;
    post: Post;
    topic: Topic;
    editor: unknown;
    slug: boolean | null;
    isBookmarked: boolean;
    user: {reputation: number};
    upvote: boolean;
    downvote: boolean;
    isEndorsed: number;
}

interface IEventObject {
  [eventName: string]: (...args: unknown[]) => void;
}

interface IEvents {
  init: () => void;
  removeListeners: () => void;
}

interface htmlType {
    attr: (arg0: string, arg1?: number) => string;
    fadeIn: (arg0: number) => void;
}

interface elementType {
    filter: (arg0: filterFunctionType) => elementType;
    html: (arg0: (number | string)) => htmlType;
    find: (arg0: string) => elementType;
    closest: (arg0: string) => htmlType;
    replaceWith: (arg0: string) => void;
    timeago: () => void;
    fadeOut: (arg0: number, arg1: () => void) => void;
    remove: () => void;
    length: number;
    attr: (arg0: string, arg1?: number | string | boolean) => string | timestampType;
    toggleClass: (arg0: string, arg1?: boolean) => void;
    addClass: (arg0: string) => void;
    fadeIn: (arg0: number) => void;
    hasClass: (arg0: string) => boolean;
    translateHtml: (arg0: string) => void;
    parent: () => elementType;
    first: () => elementType;
    translateText: (arg0: string) => void;
    prepend: (arg0: elementType) => void;
}

interface componentsType {
    get: (arg0: string, arg1?: string, arg2?: string) => elementType;
}

interface translatorType {
    unescape: (arg0: string) => string | number;
}

declare var $: (arg0: string) => elementType;
declare var components: componentsType;
declare var config: { relative_path: string; };
declare var translator: translatorType;
declare var replies;

function onUserStatusChange(data: Data): void {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    app.updateUserStatus($('[data-uid="' + data.uid + '"] [component="user/status"]'), data.status);
}

function updatePostVotesAndUserReputation(data: Data): void {
    const votes: elementType = $('[data-pid="' + data.post.pid + '"] [component="post/vote-count"]').filter(function (index, el: string) {
        return parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10);
    });
    const reputationElements: elementType = $('.reputation[data-uid="' + data.post.uid + '"]');
    votes.html(data.post.votes).attr('data-votes', data.post.votes);
    reputationElements.html(data.user.reputation).attr('data-reputation', data.user.reputation);
}

function updateBookmarkCount(data: Data): void {
    $('[data-pid="' + data.post.pid + '"] .bookmarkCount').filter(function (index, el: string) {
        return parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10);
    }).html(data.post.bookmarks).attr('data-bookmarks', data.post.bookmarks);
}

function updateEndorsed(data: Data): void {
    $('[data-pid="' + data.post.pid + '"] .endorseBtn').filter(function (index, el) {
        return parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10);
    }).html(data.isEndorsed ? 'Unendorse' : 'Endorse').attr('data-endorsed', data.isEndorsed);
}

function onTopicPurged(data: Data): void {
    if (
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ajaxify.data.category && ajaxify.data.category.slug &&
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
        parseInt(data.tid, 10) === parseInt(ajaxify.data.tid, 10)
    ) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line
        ajaxify.go(`category/${ajaxify.data.category.slug}`, null, true);
    }
}

function onTopicMoved(data: Data): void {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
    if (data && data.slug && parseInt(data.tid, 10) === parseInt(ajaxify.data.tid, 10)) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions
        ajaxify.go(`topic/${data.slug}`, null, true);
    }
}

function onPostEdited(data: Data): void {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
    if (!data?.post || parseInt(data.post.tid, 10) !== parseInt(ajaxify.data.tid, 10)) {
        return;
    }

    const editedPostEl: elementType = components
        .get('post/content', 'pid', data.post.pid)
        .filter((index, el) => parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10));

    const editorEl: elementType = $(`[data-pid="${data.post.pid}"] [component="post/editor"]`)
        .filter((index, el) => parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10));

    const topicTitle: elementType = components.get('topic/title');
    const navbarTitle = components.get('navbar/title').find('span');
    const breadCrumb = components.get('breadcrumb/current');

    if (data.topic?.rescheduled) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        ajaxify.go('topic/' + data.topic.slug, null, true);
        return;
    }

    if (topicTitle.length && data.topic.title && data.topic.renamed) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
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
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            images.wrapImagesInLinks(editedPostEl.parent());
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            posts.addBlockquoteEllipses(editedPostEl.parent());
            editedPostEl.fadeIn(250);

            const editData: Record<string, unknown> = {
                editor: data.editor,
                editedISO: utils.toISOString(data.post.edited),
            };
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            app.parseAndTranslate('partials/topic/post-editor', editData, function (html: string) {
                editorEl.replaceWith(html);
                const timeagoEL: elementType = $('[data-pid="' + data.post.pid + '"] [component="post/editor"] .timeago');
                timeagoEL.timeago();
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line max-len
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                hooks.fire('action:posts.edited', data);
            });
        });
    } else {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        hooks.fire('action:posts.edited', data);
    }

    if (data.topic.tags && data.topic.tagsupdated) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        Benchpress.render('partials/topic/tags', { tags: data.topic.tags }).then(function (html: string | number) {
            const tags = $('.tags');

            tags.fadeOut(250, function () {
                tags.html(html).fadeIn(250);
            });
        });
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    postTools.removeMenu(components.get('post', 'pid', data.post.pid));
}

function onPostPurged(postData: Post) {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const tid: string = ajaxify.data.tid;
    if (!postData || parseInt(postData.tid, 10) !== parseInt(tid, 10)) {
        return;
    }
    components.get('post', 'pid', postData.pid).fadeOut(500, function () {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        $(this).remove();
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        posts.showBottomPostBar();
    });
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    ajaxify.data.postcount -= 1;
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    postTools.updatePostCount(ajaxify.data.postcount);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    replies.onPostPurged(postData);
}

function togglePostDeleteState(data: Post) {
    const postEl: elementType = components.get('post', 'pid', data.pid);

    if (!postEl.length) {
        return;
    }

    postEl.toggleClass('deleted');
    const isDeleted: boolean = postEl.hasClass('deleted');
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    postTools.toggle(data.pid, isDeleted);
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
    if (!ajaxify.data.privileges.isAdminOrMod && parseInt(data.uid, 10) !== parseInt(app.user.uid, 10)) {
        postEl.find('[component="post/tools"]').toggleClass('hidden', isDeleted);
        if (isDeleted) {
            postEl.find('[component="post/content"]').translateHtml('[[topic:post_is_deleted]]');
        } else {
            postEl.find('[component="post/content"]').html(translator.unescape(data.content));
        }
    }
}

function togglePostBookmark(data: Data) {
    const el: elementType = $('[data-pid="' + data.post.pid + '"] [component="post/bookmark"]').filter(function (index, el) {
        return parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10);
    });
    if (!el.length) {
        return;
    }

    el.attr('data-bookmarked', data.isBookmarked);

    el.find('[component="post/bookmark/on"]').toggleClass('hidden', !data.isBookmarked);
    el.find('[component="post/bookmark/off"]').toggleClass('hidden', data.isBookmarked);
}

function togglePostVote(data: Data) {
    const post: elementType = $('[data-pid="' + data.post.pid + '"]');
    post.find('[component="post/upvote"]').filter(function (index, el) {
        return parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10);
    }).toggleClass('upvoted', data.upvote);
    post.find('[component="post/downvote"]').filter(function (index, el) {
        return parseInt($(el).closest('[data-pid]').attr('data-pid'), 10) === parseInt(data.post.pid, 10);
    }).toggleClass('downvoted', data.downvote);
}

function onNewNotification(data: Data) {
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const tid: string = ajaxify.data.tid;
    if (data && data.tid && parseInt(data.tid, 10) === parseInt(tid, 10)) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        socket.emit('topics.markTopicNotificationsRead', [tid]);
    }
}

const events: IEventObject = {
    'event:user_status_change': onUserStatusChange,
    'event:voted': updatePostVotesAndUserReputation,
    'event:bookmarked': updateBookmarkCount,
    'event:endorsed': updateEndorsed,

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    'event:topic_deleted': threadTools.setDeleteState,
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    'event:topic_restored': threadTools.setDeleteState,
    'event:topic_purged': onTopicPurged,

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    'event:topic_locked': threadTools.setLockedState,
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    'event:topic_unlocked': threadTools.setLockedState,

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    'event:topic_pinned': threadTools.setPinnedState,
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    'event:topic_unpinned': threadTools.setPinnedState,

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    'event:topic_resolved': threadTools.setResolvedState,
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
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
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    'event:new_post': posts.onNewPost,
};

const Events: IEvents = {
    init: function (): void {
        Events.removeListeners();
        for (const eventName in events) {
            if (events.hasOwnProperty(eventName)) {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line max-len
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                socket.on(eventName, events[eventName]);
            }
        }
    },
    removeListeners: function (): void {
        for (const eventName in events) {
            if (events.hasOwnProperty(eventName)) {
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line max-len
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                socket.removeListener(eventName, events[eventName]);
            }
        }
    },
};
