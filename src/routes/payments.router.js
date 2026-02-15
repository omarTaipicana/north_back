const express = require('express');
const { create, getAll, getOne, update} = require('../controllers/payments.controllers');
const { upload, generateFileUrl } = require('../utils/multer');
const verifyJWT = require("../utils/verifyJWT");
const verifyRoles = require("../utils/verifyRoles");

const paymentsRouter = express.Router();

// ⚠️ el nombre del campo file debe ser el mismo que envías desde el front/postman
// aquí lo llamo "file"
paymentsRouter.route('/payments')
  .get(getAll)
  .post(
    upload.single("file"),
    generateFileUrl,
    create
  );

paymentsRouter.route('/payments/:id')
  .get(getOne);


paymentsRouter.route("/payments/:id")
  .put(
    verifyJWT,
    verifyRoles(["admin", "validator"]),
    update
  );


module.exports = paymentsRouter;
