const { getAll, create, getOne, remove, update } = require('../controllers/events.controllers');
const express = require('express');

const eventRouter = express.Router();

eventRouter.route('/events')
    .get(getAll)
    .post(create);

eventRouter.route('/events/:id')
    .get(getOne)
    .delete(remove)
    .put(update);

module.exports = eventRouter;