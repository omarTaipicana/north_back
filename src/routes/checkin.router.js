const express = require("express");
const { checkin } = require("../controllers/checkin.controllers");
const verifyJWT = require("../utils/verifyJWT");
const verifyRoles = require("../utils/verifyRoles");

const checkinRouter = express.Router();

checkinRouter.post(
  "/checkin",
  verifyJWT,
  verifyRoles(["admin", "validator", "scanner"]),
  checkin
);

module.exports = checkinRouter;
