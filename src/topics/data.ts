import validator from 'validator';

import db from '../database';
import categories from '../categories';
import utils from '../utils';
import translator from '../translator';
import plugins from '../plugins';
import { OptionalCategory, OptionalTopic, OptionalTopicList, TopicField, TopicMethods, TopicsWrapper } from '../types';

const intFields = [
    'tid', 'cid', 'uid', 'mainPid', 'postcount',
    'viewcount', 'postercount', 'deleted', 'locked', 'pinned', 'resolved',
    'pinExpiry', 'timestamp', 'upvotes', 'downvotes', 'lastposttime',
    'deleterUid',
];


function escapeTitle(topicData: OptionalTopic) {
    if (topicData) {
        if (topicData.title) {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const validator_escape_result = String(validator.escape(topicData.title));
            const trans_escape_result : string = translator.escape(validator_escape_result);
            topicData.title = trans_escape_result;
        }
        if (topicData.titleRaw) {
            topicData.titleRaw = translator.escape(topicData.titleRaw);
        }
    }
}

function modifyTopic(topic: OptionalTopic, fields: string[]) {
    if (!topic) {
        return;
    }

    // The next line calls a function in a module that has not been updated to TS yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    db.parseIntFields(topic, intFields, fields);

    if (topic.hasOwnProperty('title')) {
        topic.titleRaw = topic.title;
        topic.title = String(topic.title);
    }

    escapeTitle(topic);

    if (topic.hasOwnProperty('timestamp')) {
        topic.timestampISO = utils.toISOString(topic.timestamp) as string;
        if (!fields.length || fields.includes('scheduled')) {
            topic.scheduled = topic.timestamp > Date.now();
        }
    }

    if (topic.hasOwnProperty('lastposttime')) {
        topic.lastposttimeISO = utils.toISOString(topic.lastposttime) as string;
    }

    if (topic.hasOwnProperty('pinExpiry')) {
        topic.pinExpiryISO = utils.toISOString(topic.pinExpiry) as string;
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
        topic.tags = tags.split(',').filter(Boolean).map((tag: string) => {
            // The next line calls a function in a module that has not been updated to TS yet
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const escaped = String(validator.escape(String(tag)));
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

export = function (Topics: TopicMethods) {
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
        const topics = await db.getObjects(keys, fields) as OptionalTopicList;
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const result = await plugins.hooks.fire('filter:topic.getFields', {
            tids: tids,
            topics: topics,
            fields: fields,
            keys: keys,
        }) as TopicsWrapper;
        result.topics.forEach(topic => modifyTopic(topic, fields));
        return result.topics;
    };

    Topics.getTopicField = async function (tid, field): Promise<TopicField> {
        const topic = await Topics.getTopicFields(tid, [field]);
        return topic ? (topic[field] as TopicField) : null;
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

    Topics.getCategoryData = async function (tid) : Promise<OptionalCategory> {
        const cid = await Topics.getTopicField(tid, 'cid');
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return await categories.getCategoryData(cid) as OptionalCategory;
    };

    Topics.setTopicField = async function (tid, field, value) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await db.setObjectField(`topic:${tid}`, field, value);
    };

    Topics.setTopicFields = async function (tid, data) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await db.setObject(`topic:${tid}`, data);
    };

    Topics.deleteTopicField = async function (tid, field) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await db.deleteObjectField(`topic:${tid}`, field);
    };

    Topics.deleteTopicFields = async function (tid, fields) {
        // The next line calls a function in a module that has not been updated to TS yet
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await db.deleteObjectFields(`topic:${tid}`, fields);
    };
};

