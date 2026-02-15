const { getAll, create, getOne, remove, update } = require('../controllers/orders.controllers');
const express = require('express');

const orderRouter = express.Router();

orderRouter.route('/orders')
    .get(getAll)
    .post(create);

orderRouter.route('/orders/:id')
    .get(getOne)
    .delete(remove)
    .put(update);

module.exports = orderRouter;
