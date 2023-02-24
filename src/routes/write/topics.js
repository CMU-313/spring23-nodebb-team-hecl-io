"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const express_1 = __importDefault(require("express"));
const connect_multiparty_1 = __importDefault(require("connect-multiparty"));
const middleware_1 = __importDefault(require("../../middleware"));
const controllers_1 = __importDefault(require("../../controllers"));
const helpers_1 = __importDefault(require("../helpers"));
const router = express_1.default.Router();
const { setupApiRoute } = helpers_1.default;
module.exports = function () {
    const middlewares = [middleware_1.default.ensureLoggedIn];
    // The next line calls a function a module that has not been updated to typescript yet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const multipartMiddleware = (0, connect_multiparty_1.default)();
    setupApiRoute(router, 'post', '/', [middleware_1.default.checkRequired.bind(null, ['cid', 'title', 'content'])], controllers_1.default.write.topics.create);
    setupApiRoute(router, 'get', '/:tid', [], controllers_1.default.write.topics.get);
    setupApiRoute(router, 'post', '/:tid', [middleware_1.default.checkRequired.bind(null, ['content']), middleware_1.default.assert.topic], controllers_1.default.write.topics.reply);
    setupApiRoute(router, 'delete', '/:tid', [...middlewares], controllers_1.default.write.topics.purge);
    setupApiRoute(router, 'put', '/:tid/state', [...middlewares], controllers_1.default.write.topics.restore);
    setupApiRoute(router, 'delete', '/:tid/state', [...middlewares], controllers_1.default.write.topics.delete);
    setupApiRoute(router, 'put', '/:tid/pin', [...middlewares, middleware_1.default.assert.topic], controllers_1.default.write.topics.pin);
    setupApiRoute(router, 'delete', '/:tid/pin', [...middlewares], controllers_1.default.write.topics.unpin);
    setupApiRoute(router, 'put', '/:tid/resolve', [...middlewares, middleware_1.default.assert.topic], controllers_1.default.write.topics.resolve);
    setupApiRoute(router, 'delete', '/:tid/resolve', [...middlewares], controllers_1.default.write.topics.unresolve);
    setupApiRoute(router, 'put', '/:tid/lock', [...middlewares], controllers_1.default.write.topics.lock);
    setupApiRoute(router, 'delete', '/:tid/lock', [...middlewares], controllers_1.default.write.topics.unlock);
    setupApiRoute(router, 'put', '/:tid/follow', [...middlewares, middleware_1.default.assert.topic], controllers_1.default.write.topics.follow);
    setupApiRoute(router, 'delete', '/:tid/follow', [...middlewares, middleware_1.default.assert.topic], controllers_1.default.write.topics.unfollow);
    setupApiRoute(router, 'put', '/:tid/ignore', [...middlewares, middleware_1.default.assert.topic], controllers_1.default.write.topics.ignore);
    setupApiRoute(router, 'delete', '/:tid/ignore', [...middlewares, middleware_1.default.assert.topic], controllers_1.default.write.topics.unfollow); // intentional, unignore == unfollow
    setupApiRoute(router, 'put', '/:tid/tags', [...middlewares, middleware_1.default.checkRequired.bind(null, ['tags']), middleware_1.default.assert.topic], controllers_1.default.write.topics.addTags);
    setupApiRoute(router, 'delete', '/:tid/tags', [...middlewares, middleware_1.default.assert.topic], controllers_1.default.write.topics.deleteTags);
    setupApiRoute(router, 'get', '/:tid/thumbs', [], controllers_1.default.write.topics.getThumbs);
    setupApiRoute(router, 'post', '/:tid/thumbs', [multipartMiddleware, middleware_1.default.validateFiles, middleware_1.default.uploads.ratelimit, ...middlewares], controllers_1.default.write.topics.addThumb);
    setupApiRoute(router, 'put', '/:tid/thumbs', [...middlewares, middleware_1.default.checkRequired.bind(null, ['tid'])], controllers_1.default.write.topics.migrateThumbs);
    setupApiRoute(router, 'delete', '/:tid/thumbs', [...middlewares, middleware_1.default.checkRequired.bind(null, ['path'])], controllers_1.default.write.topics.deleteThumb);
    setupApiRoute(router, 'put', '/:tid/thumbs/order', [...middlewares, middleware_1.default.checkRequired.bind(null, ['path', 'order'])], controllers_1.default.write.topics.reorderThumbs);
    setupApiRoute(router, 'get', '/:tid/events', [middleware_1.default.assert.topic], controllers_1.default.write.topics.getEvents);
    setupApiRoute(router, 'delete', '/:tid/events/:eventId', [middleware_1.default.assert.topic], controllers_1.default.write.topics.deleteEvent);
    return router;
};
