const express = require("express");
const { register, login, getMe } = require("../controllers/staffAuth.controllers");
const verifyJWT = require("../utils/verifyJWT");

const staffAuthRouter = express.Router();

staffAuthRouter.post("/staff/register", register);
staffAuthRouter.post("/staff/login", login);
staffAuthRouter.get("/staff/me", verifyJWT, getMe);

module.exports = staffAuthRouter;
