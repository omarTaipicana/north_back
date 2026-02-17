const express = require("express");
const {
  getAll,
  create,
  getOne,
  remove,
  update,
} = require("../controllers/contactanos.controllers");

const verifyJWT = require("../utils/verifyJWT");
const verifyRoles = require("../utils/verifyRoles");

const contactanosRouter = express.Router();

/**
 * ✅ PUBLIC
 * El formulario de Contacto (público)
 */
contactanosRouter.post("/contactanos", create);

/**
 * ✅ STAFF / ADMIN
 * Ver lista y administrar mensajes
 */
contactanosRouter.get(
  "/contactanos",
  verifyJWT,
  verifyRoles(["admin"]),
  getAll
);

contactanosRouter.get(
  "/contactanos/:id",
  verifyJWT,
  verifyRoles(["admin"]),
  getOne
);

contactanosRouter.put(
  "/contactanos/:id",
  verifyJWT,
  verifyRoles(["admin"]),
  update
);

/**
 * Soft delete (papelera): is_active=false
 */
contactanosRouter.delete(
  "/contactanos/:id",
  verifyJWT,
  verifyRoles(["admin"]),
  remove
);

module.exports = contactanosRouter;
