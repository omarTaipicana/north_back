const express = require("express");
const { getDashboard, getDashboardEventsSummary } = require("../controllers/adminDashboard.controllers");
const verifyJWT = require("../utils/verifyJWT");
const verifyRoles = require("../utils/verifyRoles");

const adminRouter = express.Router();

adminRouter.get(
  "/admin/dashboard",
  verifyJWT,
  verifyRoles(["admin"]),
  getDashboard
);

adminRouter.get(
  "/admin/dashboard/events-summary",
  verifyJWT,
  verifyRoles(["admin"]),
  getDashboardEventsSummary
);

module.exports = adminRouter;
