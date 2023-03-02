"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const validator_1 = __importDefault(require("validator"));
const database_1 = __importDefault(require("../database"));
const categories_1 = __importDefault(require("../categories"));
const utils_1 = __importDefault(require("../utils"));
const translator_1 = __importDefault(require("../translator"));
const plugins_1 = __importDefault(require("../plugins"));
const intFields = [
    'tid', 'cid', 'uid', 'mainPid', 'postcount',
    'viewcount', 'postercount', 'deleted', 'locked', 'pinned', 'resolved',
    'pinExpiry', 'timestamp', 'upvotes', 'downvotes', 'lastposttime',
    'deleterUid',
];
function escapeTitle(topicData) {
    if (topicData) {
        if (topicData.title) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const validator_escape_result = String(validator_1.default.escape(topicData.title));
            const trans_escape_result = translator_1.default.escape(validator_escape_result);
            topicData.title = trans_escape_result;
        }
        if (topicData.titleRaw) {
            topicData.titleRaw = translator_1.default.escape(topicData.titleRaw);
        }
    }
}
function modifyTopic(topic, fields) {
    if (!topic) {
        return;
    }
    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    database_1.default.parseIntFields(topic, intFields, fields);
    if (topic.hasOwnProperty('title')) {
        topic.titleRaw = topic.title;
        topic.title = String(topic.title);
    }
    escapeTitle(topic);
    if (topic.hasOwnProperty('timestamp')) {
        topic.timestampISO = utils_1.default.toISOString(topic.timestamp);
        if (!fields.length || fields.includes('scheduled')) {
            topic.scheduled = topic.timestamp > Date.now();
        }
    }
    if (topic.hasOwnProperty('lastposttime')) {
        topic.lastposttimeISO = utils_1.default.toISOString(topic.lastposttime);
    }
    if (topic.hasOwnProperty('pinExpiry')) {
        topic.pinExpiryISO = utils_1.default.toISOString(topic.pinExpiry);
    }
    if (topic.hasOwnProperty('upvotes') && topic.hasOwnProperty('downvotes')) {
        topic.votes = topic.upvotes - topic.downvotes;
    }
    if (topic.hasOwnProperty('isAnon')) {
        topic.isAnon = topic.isAnon === 'true';
    }
    // if (topic.hasOwnProperty('isPrivate')) {
    //     topic.isPrivate = topic.isPrivate === 'true';
    // }
    if (fields.includes('teaserPid') || !fields.length) {
        topic.teaserPid = topic.teaserPid || null;
    }
    if (fields.includes('tags') || !fields.length) {
        const tags = String(topic.tags || '');
        topic.tags = tags.split(',').filter(Boolean).map((tag) => {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const escaped = String(validator_1.default.escape(String(tag)));
            return {
                value: tag,
                valueEscaped: escaped,
                valueEncoded: encodeURIComponent(escaped),
                // The next line calls a function in a module that has not been updated to TS yet
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                class: escaped.replace(/\s/g, '-'),
            };
        });
    }
}
module.exports = function (Topics) {
    Topics.getTopicsFields = async function (tids, fields) {
        if (!Array.isArray(tids) || !tids.length) {
            return [];
        }
        // "scheduled" is derived from "timestamp"
        if (fields.includes('scheduled') && !fields.includes('timestamp')) {
            fields.push('timestamp');
        }
        const keys = tids.map(tid => `topic:${tid}`);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const topics = await database_1.default.getObjects(keys, fields);
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const result = await plugins_1.default.hooks.fire('filter:topic.getFields', {
            tids: tids,
            topics: topics,
            fields: fields,
            keys: keys,
        });
        result.topics.forEach(topic => modifyTopic(topic, fields));
        return result.topics;
    };
    Topics.getTopicField = async function (tid, field) {
        const topic = await Topics.getTopicFields(tid, [field]);
        return topic ? topic[field] : null;
    };
    Topics.getTopicFields = async function (tid, fields) {
        const topics = await Topics.getTopicsFields([tid], fields);
        return topics ? topics[0] : null;
    };
    Topics.getTopicData = async function (tid) {
        const topics = await Topics.getTopicsFields([tid], []);
        return topics && topics.length ? topics[0] : null;
    };
    Topics.getTopicsData = async function (tids) {
        return await Topics.getTopicsFields(tids, []);
    };
    Topics.getCategoryData = async function (tid) {
        const cid = await Topics.getTopicField(tid, 'cid');
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await categories_1.default.getCategoryData(cid);
    };
    Topics.setTopicField = async function (tid, field, value) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await database_1.default.setObjectField(`topic:${tid}`, field, value);
    };
    Topics.setTopicFields = async function (tid, data) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await database_1.default.setObject(`topic:${tid}`, data);
    };
    Topics.deleteTopicField = async function (tid, field) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await database_1.default.deleteObjectField(`topic:${tid}`, field);
    };
    Topics.deleteTopicFields = async function (tid, fields) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await database_1.default.deleteObjectFields(`topic:${tid}`, fields);
    };
};
