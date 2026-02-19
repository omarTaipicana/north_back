const catchError = require("../utils/catchError");
const Tickets = require("../models/Tickets");
const Events = require("../models/Events");
const Orders = require("../models/Orders");
const StaffUser = require("../models/StaffUser");

const pick = (...vals) => vals.find(v => v !== undefined && v !== null);

const buildBuyer = (order) => {
  if (!order) return null;
  return {
    name: order.buyer_name || null,
    email: order.buyer_email || null,
    phone: order.buyer_phone || null,
  };
};

const buildOrderInfo = (order, event) => {
  if (!order) return null;
  const qty = Number(order.quantity || 0);
  const unit = Number(event?.price || 0);
  const total = qty && unit ? Number((qty * unit).toFixed(2)) : null;

  return {
    id: order.id || null,
    quantity: order.quantity ?? null,
    status: order.status || null,
    unit_price: event?.price ?? null,
    total, // ✅ calculado (no depende de columna)
  };
};

const buildEventInfo = (event, fallbackEventId) => ({
  id: event?.id || fallbackEventId || null,
  title: event?.title || null,
  venue: event?.venue || null,
  city: event?.city || null,
  starts_at: event?.starts_at || null,
});

const buildTicketInfo = (ticket) => ({
  id: ticket?.id || null,
  code: ticket?.code || null,
  status: ticket?.status || null,
  used_at: ticket?.used_at || null,
  gate: ticket?.gate || null,
  used_by: ticket?.used_by || null,
  eventId: ticket?.eventId || null,
  orderId: ticket?.orderId || null,
});

const buildStaffInfo = (staff) => {
  if (!staff) return null;
  return {
    id: staff.id,
    full_name: staff.full_name || null,
    email: staff.email || null,
    role: staff.role || null,
  };
};

const checkin = catchError(async (req, res) => {
  const { code, gate } = req.body;
  if (!code) return res.status(400).json({ message: "Falta code" });

  // 1) buscar ticket
  const ticket = await Tickets.findOne({ where: { code } });
  if (!ticket) return res.status(404).json({ message: "Ticket no encontrado" });

  // 2) evento
  const event = await Events.findByPk(ticket.eventId);
  if (!event) return res.status(404).json({ message: "Evento no encontrado" });
  if (!event.is_active) return res.status(403).json({ message: "Evento inactivo" });

  const now = new Date();
  if (event.checkin_opens_at && now < new Date(event.checkin_opens_at)) {
    return res.status(403).json({ message: "Check-in aún no habilitado" });
  }
  if (event.checkin_closes_at && now > new Date(event.checkin_closes_at)) {
    return res.status(403).json({ message: "Check-in cerrado" });
  }

  // 3) buscar orden (si tienes ticket.orderId)
  let order = null;
  if (ticket.orderId) {
    order = await Orders.findByPk(ticket.orderId);
  }

  // 4) update atómico
  const [rowsUpdated, updated] = await Tickets.update(
    {
      status: "used",
      used_at: new Date(),
      used_by: req.user.id,
      gate: gate || null,
    },
    {
      where: { id: ticket.id, status: "unused" },
      returning: true,
    }
  );

  // ya usado / void
  if (rowsUpdated === 0) {
    const fresh = await Tickets.findByPk(ticket.id);

    // orden (si existe)
    let freshOrder = null;
    if (fresh?.orderId) {
      freshOrder = await Orders.findByPk(fresh.orderId);
    }

    // staff que lo registró antes
    let usedByStaff = null;
    if (fresh?.used_by) {
      const staff = await StaffUser.findByPk(fresh.used_by, {
        attributes: ["id", "full_name", "email", "role"],
      });
      usedByStaff = buildStaffInfo(staff);
    }

    return res.status(409).json({
      message:
        fresh?.status === "used"
          ? "Entrada ya fue utilizada"
          : `Entrada no válida (status: ${fresh?.status})`,

      ticket: buildTicketInfo(fresh),
      event: buildEventInfo(event, fresh?.eventId),
      buyer: buildBuyer(freshOrder),
      order: buildOrderInfo(freshOrder, event),
      used_by_staff: usedByStaff,
    });
  }

  const updatedTicket = updated?.[0] || null;

  return res.json({
    message: "✅ Check-in exitoso",
    ticket: buildTicketInfo(updatedTicket),
    event: buildEventInfo(event, ticket.eventId),
    buyer: buildBuyer(order),
    order: buildOrderInfo(order, event),

    // operador actual (opcional)
    staff: {
      id: req.user.id,
      full_name: req.user.full_name || null,
      role: req.user.role || null,
    },
  });
});

module.exports = { checkin };
