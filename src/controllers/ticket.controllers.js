const catchError = require("../utils/catchError");
const Tickets = require("../models/Tickets");
const Events = require("../models/Events");
const Orders = require("../models/Orders");
const StaffUser = require("../models/StaffUser");
const jwt = require("jsonwebtoken");

const getPublicTicket = catchError(async (req, res) => {
  const { code } = req.params;

  // ✅ Ticket + Order + Staff (quien lo marcó "used")
  const ticket = await Tickets.findOne({
    where: { code },
    include: [
      {
        model: Orders,
        required: false,
      },
      {
        model: StaffUser,
        as: "usedByStaff", // ✅ alias de la asociación por used_by
        required: false,
        attributes: ["id", "full_name", "email", "role"], // opcional
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

  // 🔎 Verificar token (si es staff lo redirigimos al scanner)
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
      if (["admin", "validator", "scanner"].includes(decoded.user.role)) {
        return res.json({ redirect: `/staff/scanner?code=${code}` });
      }
    } catch {
      // token inválido => seguir como público
    }
  }

  // ✅ Order incluido (depende del nombre que Sequelize te ponga)
  const order = ticket.order || ticket.Order || null;

  // ✅ Staff incluido por alias
  const usedByStaff = ticket.usedByStaff || null;

  // ✅ Buyer
  const buyer = order
    ? {
        name: order.buyer_name ?? null,
        email: order.buyer_email ?? null,
        phone: order.buyer_phone ?? null,
      }
    : null;

  // ✅ Order info (SIN total porque tu tabla orders no tiene esa columna)
  const orderInfo = order
    ? {
        id: order.id ?? null,
        quantity: order.quantity ?? null,
        status: order.status ?? null,
      }
    : null;

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
      gate: ticket.gate || null,
      used_at: ticket.used_at || null,
    },

    buyer,
    order: orderInfo,

    event: {
      id: event?.id || ticket.eventId,
      title: event?.title || null,
      venue: event?.venue || null,
      city: event?.city || null,
      starts_at: event?.starts_at || null,
    },

    // ✅ quien registró el ingreso (cuando status = used)
    used_by_staff: usedByStaff
      ? {
          id: usedByStaff.id,
          full_name: usedByStaff.full_name || null,
          email: usedByStaff.email || null,
          role: usedByStaff.role || null,
        }
      : null,
  });
});

module.exports = { getPublicTicket };
