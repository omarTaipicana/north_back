const catchError = require("../utils/catchError");
const Tickets = require("../models/Tickets");
const Events = require("../models/Events");
const StaffUser = require("../models/StaffUser");
const jwt = require("jsonwebtoken");

const getPublicTicket = catchError(async (req, res) => {
  const { code } = req.params;

  const ticket = await Tickets.findOne({ where: { code } });
  if (!ticket) {
    return res.status(404).json({
      status: "not_found",
      message: "Entrada no encontrada",
    });
  }

  const event = await Events.findByPk(ticket.eventId);

  // 🔎 Verificar si viene token
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

      if (["admin", "validator", "scanner"].includes(decoded.user.role)) {
        // 🔥 Si es staff → redirigir al scanner
        return res.json({
          redirect: `/staff/scanner?code=${code}`,
        });
      }
    } catch (err) {
      // Token inválido → continuar como público
    }
  }

  // 👤 Respuesta pública
  return res.json({
    status: ticket.status,
    event: {
      title: event?.title,
      venue: event?.venue,
      starts_at: event?.starts_at,
    },
    used_at: ticket.used_at,
  });
});

module.exports = { getPublicTicket };
