"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.unfollow = exports.ignore = exports.follow = exports.unlock = exports.lock = exports.unresolve = exports.resolve = exports.unpin = exports.pin = exports.purge = exports.restore = exports.delete = exports.del = exports.reply = exports.create = exports.get = void 0;
const user = require("../user");
const topics = require("../topics");
const posts = require("../posts");
const meta = require("../meta");
const privileges = require("../privileges");
const apiHelpers = require("./helpers");
const websockets = require("../socket.io");
const socketHelpers = require("../socket.io/helpers");
const {
  doTopicAction
} = apiHelpers;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
async function get(caller, data) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const [userPrivileges, topic] = await Promise.all([
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  privileges.topics.get(data.tid, caller.uid),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  topics.getTopicData(data.tid)]);
  if (!topic ||
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  !userPrivileges.read ||
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  !userPrivileges['topics:read'] ||
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
  !privileges.topics.canViewDeletedScheduled(topic, userPrivileges)) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  return topic;
}
exports.get = get;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
async function create(caller, data) {
  if (!data) {
    throw new Error('[[error:invalid-data]]');
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const payload = Object.assign({}, data);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  payload.tags = payload.tags || [];
  apiHelpers.setDefaultPostData(caller, payload);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const isScheduling = parseInt(data.timeStamp, 10) > payload.timestamp;
  if (isScheduling) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    if (await privileges.categories.can('topics:schedule', data.cid, caller.uid)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      payload.timestamp = parseInt(data.timeStamp, 10);
    } else {
      throw new Error('[[error:no-privileges]]');
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  await meta.blacklist.test(caller.ip);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const shouldQueue = await posts.shouldQueue(caller.uid, payload);
  if (shouldQueue) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return await posts.addToQueue(payload);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const result = await topics.post(payload);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  await topics.thumbs.migrate(data.uuid, result.topicData.tid);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  await socketHelpers.emitToUids('event:new_post', {
    posts: [result.postData]
  }, [caller.uid]);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  await socketHelpers.emitToUids('event:new_topic', result.topicData, [caller.uid]);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  await socketHelpers.notifyNew(caller.uid, 'newTopic', {
    posts: [result.postData],
    topic: result.topicData
  });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  return result.topicData;
}
exports.create = create;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
async function reply(caller, data) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  if (!data || !data.tid || meta.config.minimumPostLength !== 0 && !data.content) {
    throw new Error('[[error:invalid-data]]');
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const payload = Object.assign({}, data);
  apiHelpers.setDefaultPostData(caller, payload);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  await meta.blacklist.test(caller.ip);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const shouldQueue = await posts.shouldQueue(caller.uid, payload);
  if (shouldQueue) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    return await posts.addToQueue(payload);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const postData = await topics.reply(payload);
  // postData seems to be a subset of postObj, refactor?
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const postObj = await posts.getPostSummaryByPids([postData.pid], caller.uid, {});
  const result = {
    posts: [postData],
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    'reputation:disabled': meta.config['reputation:disabled'] === 1,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    'downvote:disabled': meta.config['downvote:disabled'] === 1
  };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  user.updateOnlineUsers(caller.uid);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  if (caller.uid) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await socketHelpers.emitToUids('event:new_post', result, [caller.uid]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  } else if (caller.uid === 0) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    websockets.in('online_guests').emit('event:new_post', result);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  await socketHelpers.notifyNew(caller.uid, 'newPost', result);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  return postObj[0];
}
exports.reply = reply;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
async function del(caller, data) {
  await doTopicAction('delete', 'event:topic_deleted', caller, {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    tids: data.tids
  });
}
exports.del = del;
exports.delete = del;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
async function restore(caller, data) {
  await doTopicAction('restore', 'event:topic_restored', caller, {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    tids: data.tids
  });
}
exports.restore = restore;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
async function purge(caller, data) {
  await doTopicAction('purge', 'event:topic_purged', caller, {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    tids: data.tids
  });
}
exports.purge = purge;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
async function pin(caller, data) {
  await doTopicAction('pin', 'event:topic_pinned', caller, {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    tids: data.tids
  });
}
exports.pin = pin;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
async function unpin(caller, data) {
  await doTopicAction('unpin', 'event:topic_unpinned', caller, {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    tids: data.tids
  });
}
exports.unpin = unpin;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
async function resolve(caller, data) {
  await doTopicAction('resolve', 'event:topic_resolved', caller, {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    tids: data.tids
  });
}
exports.resolve = resolve;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
async function unresolve(caller, data) {
  await doTopicAction('unresolve', 'event:topic_unresolved', caller, {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    tids: data.tids
  });
}
exports.unresolve = unresolve;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
async function lock(caller, data) {
  await doTopicAction('lock', 'event:topic_locked', caller, {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    tids: data.tids
  });
}
exports.lock = lock;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
async function unlock(caller, data) {
  await doTopicAction('unlock', 'event:topic_unlocked', caller, {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    tids: data.tids
  });
}
exports.unlock = unlock;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
async function follow(caller, data) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  await topics.follow(data.tid, caller.uid);
}
exports.follow = follow;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
async function ignore(caller, data) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  await topics.ignore(data.tid, caller.uid);
}
exports.ignore = ignore;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
async function unfollow(caller, data) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  await topics.unfollow(data.tid, caller.uid);
}
exports.unfollow = unfollow;