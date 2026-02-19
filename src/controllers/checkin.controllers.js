const catchError = require("../utils/catchError");
const Tickets = require("../models/Tickets");
const Events = require("../models/Events");
const Orders = require("../models/Orders");     // ✅
const StaffUser = require("../models/StaffUser");

const pickBuyerAndOrder = (order) => {
  if (!order) return { buyer: null, orderInfo: null };

  const buyer = {
    name: order.buyer_name ?? null,
    email: order.buyer_email ?? null,
    phone: order.buyer_phone ?? null,
  };

  const orderInfo = {
    id: order.id ?? null,
    quantity: order.quantity ?? null,
    total: order.total ?? null, // si no tienes total en Orders, puedes omitirlo
  };

  return { buyer, orderInfo };
};

const checkin = catchError(async (req, res) => {
  const { code, gate } = req.body;
  if (!code) return res.status(400).json({ message: "Falta code" });

  // 1) Buscar ticket (incluye orderId si existe la relación)
  const ticket = await Tickets.findOne({
    where: { code },
    include: [
      {
        model: Orders,
        required: false,
        attributes: ["id", "buyer_name", "buyer_email", "buyer_phone", "quantity", "total", "createdAt"],
      },
    ],
  });

  if (!ticket) return res.status(404).json({ message: "Ticket no encontrado" });

  // 2) Validar evento
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

  // 3) ATÓMICO
  const [rowsUpdated] = await Tickets.update(
    {
      status: "used",
      used_at: new Date(),
      used_by: req.user.id, // staff id del JWT
      gate: gate || null,
    },
    {
      where: { id: ticket.id, status: "unused" },
      returning: true,
    }
  );

  // helper: arma buyer/order desde la orden incluida
  const orderFromTicket = ticket.Order || ticket.order || null;
  const { buyer, orderInfo } = pickBuyerAndOrder(orderFromTicket);

  // Si no se actualizó, es porque ya estaba used/void
  if (rowsUpdated === 0) {
    // 🔥 vuelve a traer ticket + order para mostrar comprador igual en error
    const fresh = await Tickets.findByPk(ticket.id, {
      include: [
        {
          model: Orders,
          required: false,
          attributes: ["id", "buyer_name", "buyer_email", "buyer_phone", "quantity", "total", "createdAt"],
        },
      ],
    });

    const ordFresh = fresh?.Order || fresh?.order || null;
    const picked = pickBuyerAndOrder(ordFresh);

    // staff si existe used_by
    let staffInfo = null;
    if (fresh?.used_by) {
      const staff = await StaffUser.findByPk(fresh.used_by, {
        attributes: ["id", "full_name", "email", "role"],
      });
      if (staff) staffInfo = staff;
    }

    // responde con payload completo
    if (fresh?.status === "used") {
      return res.status(409).json({
        message: "Entrada ya fue utilizada",
        ticket: {
          id: fresh.id,
          code: fresh.code,
          status: fresh.status,
          used_at: fresh.used_at,
          gate: fresh.gate,
          used_by: fresh.used_by,
        },
        buyer: picked.buyer,
        order: picked.orderInfo,
        event: {
          id: event.id,
          title: event.title,
          venue: event.venue,
          city: event.city || null,
          starts_at: event.starts_at,
        },
        staff: staffInfo,
      });
    }

    return res.status(409).json({
      message: `Entrada no válida (status: ${fresh?.status})`,
      ticket: {
        id: fresh?.id,
        code: fresh?.code,
        status: fresh?.status,
        used_at: fresh?.used_at || null,
        gate: fresh?.gate || null,
        used_by: fresh?.used_by || null,
      },
      buyer: picked.buyer,
      order: picked.orderInfo,
      event: {
        id: event.id,
        title: event.title,
        venue: event.venue,
        city: event.city || null,
        starts_at: event.starts_at,
      },
      staff: staffInfo,
    });
  }

  // ✅ éxito: vuelve a traer el ticket YA actualizado (con order incluido)
  const saved = await Tickets.findByPk(ticket.id, {
    include: [
      {
        model: Orders,
        required: false,
        attributes: ["id", "buyer_name", "buyer_email", "buyer_phone", "quantity", "total", "createdAt"],
      },
    ],
  });

  const ordSaved = saved?.Order || saved?.order || null;
  const pickedSaved = pickBuyerAndOrder(ordSaved);

  const io = req.app.get("io");
  if (io) {
    io.to(`event:${ticket.eventId}`).emit("dashboard:update", {
      type: "checkin",
      eventId: ticket.eventId,
    });
  }

  return res.json({
    message: "✅ Check-in exitoso",
    ticket: {
      id: saved.id,
      code: saved.code,
      status: saved.status,
      used_at: saved.used_at,
      gate: saved.gate,
      used_by: saved.used_by,
    },
    buyer: pickedSaved.buyer,
    order: pickedSaved.orderInfo,
    event: {
      id: event.id,
      title: event.title,
      venue: event.venue,
      city: event.city || null,
      starts_at: event.starts_at,
    },
    // si quieres también devolver staff actual (quien hizo checkin)
    staff: {
      id: req.user.id,
      full_name: req.user.full_name || req.user.fullName || null,
      role: req.user.role || null,
      email: req.user.email || null,
    },
  });
});

module.exports = { checkin };
