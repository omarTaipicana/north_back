const catchError = require("../utils/catchError");
const Orders = require("../models/Orders");
const Tickets = require("../models/Tickets");
const Events = require("../models/Events");
const generateTicketsPdf = require("../utils/generateTicketsPdf");

const getAll = catchError(async(req, res) => {
    const results = await Orders.findAll();
    return res.json(results);
});

const create = catchError(async(req, res) => {
    const {
        eventId,
        buyer_name,
        buyer_email,
        buyer_phone,
        quantity
    } = req.body;

    // Validación mínima rápida
    if (!eventId || !buyer_name || !buyer_email || !buyer_phone || !quantity) {
        return res.status(400).json({
            message: "Faltan datos: eventId, buyer_name, buyer_email, buyer_phone, quantity"
        });
    }

    const result = await Orders.create({
        eventId,
        buyer_name,
        buyer_email,
        buyer_phone,
        quantity,
        status: "pending_payment"
    });

    return res.status(201).json(result);
});

const getOne = catchError(async(req, res) => {
    const { id } = req.params;
    const result = await Orders.findByPk(id);
    if(!result) return res.sendStatus(404);
    return res.json(result);
});

const remove = catchError(async(req, res) => {
    const { id } = req.params;
    await Orders.destroy({ where: {id} });
    return res.sendStatus(204);
});

const update = catchError(async(req, res) => {
    const { id } = req.params;
    const result = await Orders.update(
        req.body,
        { where: {id}, returning: true }
    );
    if(result[0] === 0) return res.sendStatus(404);
    return res.json(result[1][0]);
});

const downloadOrderTicketsPdf = catchError(async (req, res) => {
  const { orderId } = req.params;

  const order = await Orders.findByPk(orderId);
  if (!order) return res.status(404).json({ message: "Orden no existe" });

  const tickets = await Tickets.findAll({ where: { orderId } });
  if (!tickets.length) {
    return res.status(404).json({ message: "No hay tickets para esta orden" });
  }

  const event = await Events.findByPk(order.eventId);

  const baseUrl = process.env.FRONT_URL || "https://northeventos.com"; // pon tu dominio

  const pdfBuffer = await generateTicketsPdf({
    order,
    tickets,
    event,
    baseUrl,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="tickets_${orderId}.pdf"`
  );
  res.send(pdfBuffer);
});

module.exports = {
    getAll,
    create,
    getOne,
    remove,
    update,
    downloadOrderTicketsPdf,
};
