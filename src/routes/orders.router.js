const { getAll, create, getOne, remove, update, downloadOrderTicketsPdf } = require('../controllers/orders.controllers');
const verifyJWT = require("../utils/verifyJWT");
const verifyRoles = require("../utils/verifyRoles"); 
const express = require('express');

const orderRouter = express.Router();

orderRouter.route('/orders')
    .get(getAll)
    .post(create);

orderRouter.route('/orders/:id')
    .get(getOne)
    .delete(remove)
    .put(update);

orderRouter.get(
  "/orders/:orderId/tickets.pdf",
  verifyJWT,
  downloadOrderTicketsPdf
);

module.exports = orderRouter;
