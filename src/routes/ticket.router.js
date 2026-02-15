const express = require("express");
const { getPublicTicket } = require("../controllers/ticket.controllers");

const ticketRouter = express.Router();

ticketRouter.get("/ticket/:code", getPublicTicket);

module.exports = ticketRouter;
