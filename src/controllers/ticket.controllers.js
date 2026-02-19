const catchError = require("../utils/catchError");
const Tickets = require("../models/Tickets");
const Events = require("../models/Events");
const Orders = require("../models/Orders");
const StaffUser = require("../models/StaffUser");
const jwt = require("jsonwebtoken");

const getPublicTicket = catchError(async (req, res) => {
  const { code } = req.params;

  // ✅ Traemos ticket + orden + staff (si existen relaciones)
  const ticket = await Tickets.findOne({
    where: { code },
    include: [
      {
        model: Orders,
        required: false,
      },
      {
        model: StaffUser,
        required: false,
      },
    ],
  });

  if (!ticket) {
    return res.status(404).json({
      status: "not_found",
      message: "Entrada no encontrada",
    });
  }

  // ✅ Evento
  const event = await Events.findByPk(ticket.eventId);

  // 🔎 Verificar si viene token (staff)
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

  // ✅ Intentar detectar la orden incluida (depende de tus asociaciones)
  const order =
    ticket.order || ticket.Order || ticket.orden || ticket.Orden || null;

  // ✅ Intentar detectar staff incluido (depende de tus asociaciones)
  const staff =
    ticket.staff || ticket.StaffUser || ticket.staffUser || null;

  // ✅ Armar comprador (si existe order)
  const buyer = order
    ? {
        name:
          order.buyer_name ||
          order.buyerName ||
          order.nombre ||
          order.nombres ||
          null,
        email:
          order.buyer_email ||
          order.buyerEmail ||
          order.email ||
          null,
        phone:
          order.buyer_phone ||
          order.buyerPhone ||
          order.telefono ||
          null,
      }
    : null;

  // ✅ Armar resumen orden (si existe)
  const orderInfo = order
    ? {
        id: order.id || null,
        quantity: order.quantity ?? order.cantidad ?? null,
        total: order.total ?? order.amount ?? order.monto ?? null,
      }
    : null;

  // 👤 Respuesta pública AMPLIADA
  return res.json({
    status: ticket.status,
    message:
      ticket.status === "used"
        ? "Entrada ya utilizada"
        : ticket.status === "void"
        ? "Entrada anulada"
        : "Entrada válida",

    ticket: {
      id: ticket.id,
      code: ticket.code,
      gate: ticket.gate || null,     // si tienes ese campo
      used_at: ticket.used_at || null,
    },

    buyer,        // ✅ comprador
    order: orderInfo, // ✅ orden (cantidad/total)

    event: {
      id: event?.id || ticket.eventId,
      title: event?.title,
      venue: event?.venue,
      city: event?.city || null,
      starts_at: event?.starts_at,
    },

    staff: staff
      ? {
          id: staff.id,
          full_name: staff.full_name || staff.fullName || null,
          role: staff.role || null,
        }
      : null,
  });
});

module.exports = { getPublicTicket };
