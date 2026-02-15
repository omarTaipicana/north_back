const express = require("express");
const { getDashboard } = require("../controllers/adminDashboard.controllers");
const verifyJWT = require("../utils/verifyJWT");
const verifyRoles = require("../utils/verifyRoles");

const adminRouter = express.Router();

adminRouter.get(
  "/admin/dashboard",
  verifyJWT,
  verifyRoles(["admin"]),
  getDashboard
);

module.exports = adminRouter;
