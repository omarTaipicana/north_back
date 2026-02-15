const express = require('express');
const eventRouter = require('./events.router');
const orderRouter = require('./orders.router');
const paymentsRouter = require('./payments.router');
const staffAuthRouter = require('./staffAuth.router');
const checkinRouter = require('./checkin.router');
const ticketRouter = require('./ticket.router');
const adminRouter = require('./admin.router');
const router = express.Router();

// colocar las rutas aquí

router.use(eventRouter)
router.use(orderRouter)
router.use(paymentsRouter);
router.use(staffAuthRouter);
router.use(checkinRouter);
router.use(ticketRouter);
router.use(adminRouter);


module.exports = router;