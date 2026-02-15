const catchError = require("../utils/catchError");
const { Op, fn, col, literal } = require("sequelize");
const Events = require("../models/Events");
const Orders = require("../models/Orders");
const Payments = require("../models/Payments");
const Tickets = require("../models/Tickets");
const StaffUser = require("../models/StaffUser");

const getDashboard = catchError(async (req, res) => {
  const { eventId } = req.query;

  // filtros opcionales por evento
  const ordersWhere = eventId ? { eventId } : {};
  const ticketsWhere = eventId ? { eventId } : {};
  // payments se filtra por orderId => lo hacemos por include en query separada

  // 1) Conteos de tickets
  const totalTickets = await Tickets.count({ where: ticketsWhere });
  const usedTickets = await Tickets.count({ where: { ...ticketsWhere, status: "used" } });
  const unusedTickets = await Tickets.count({ where: { ...ticketsWhere, status: "unused" } });
  const voidTickets = await Tickets.count({ where: { ...ticketsWhere, status: "void" } });

  // 2) Órdenes (cantidad comprada desde orders.quantity)
  const ordersAgg = await Orders.findAll({
    where: ordersWhere,
    attributes: [
      [fn("COUNT", col("id")), "orders_count"],
      [fn("COALESCE", fn("SUM", col("quantity")), 0), "qty_total"],
    ],
    raw: true,
  });

  const orders_count = Number(ordersAgg?.[0]?.orders_count || 0);
  const qty_total = Number(ordersAgg?.[0]?.qty_total || 0);

  // 3) Pagos (recibidos vs validados) y recaudación
  //    OJO: payments tiene orderId, por eso filtramos por orders del evento con include.
  const payments = await Payments.findAll({
    attributes: [
      [fn("COUNT", col("payments.id")), "payments_count"],
      [fn("COALESCE", fn("SUM", col("payments.amount")), 0), "amount_total_all"],
      [fn("COALESCE", fn("SUM", literal(`CASE WHEN "payments"."is_validated" = true THEN "payments"."amount" ELSE 0 END`)), 0), "amount_total_validated"],
      [fn("COALESCE", fn("SUM", literal(`CASE WHEN "payments"."is_validated" = true THEN 1 ELSE 0 END`)), 0), "payments_validated_count"],
    ],
    include: [
      {
        model: Orders,
        attributes: [],
        required: true,
        where: ordersWhere,
      },
    ],
    raw: true,
  });

  const payments_count = Number(payments?.[0]?.payments_count || 0);
  const payments_validated_count = Number(payments?.[0]?.payments_validated_count || 0);
  const amount_total_all = Number(payments?.[0]?.amount_total_all || 0);
  const amount_total_validated = Number(payments?.[0]?.amount_total_validated || 0);

  // 4) “Tickets usados por staff” (ranking)
  const usedByStaff = await Tickets.findAll({
    where: { ...ticketsWhere, status: "used" },
    attributes: [
      "used_by",
      [fn("COUNT", col("tickets.id")), "used_count"],
      [fn("MAX", col("used_at")), "last_scan_at"],
    ],
    group: ["used_by"],
    raw: true,
  });

  // Traer nombres del staff
  const staffIds = usedByStaff.map((x) => x.used_by).filter(Boolean);
  const staffRows = staffIds.length
    ? await StaffUser.findAll({
        where: { id: staffIds },
        attributes: ["id", "full_name", "email", "role"],
        raw: true,
      })
    : [];

  const staffMap = {};
  staffRows.forEach((s) => (staffMap[s.id] = s));

  const used_by_staff = usedByStaff
    .map((x) => ({
      staff: x.used_by ? staffMap[x.used_by] || { id: x.used_by } : null,
      used_count: Number(x.used_count || 0),
      last_scan_at: x.last_scan_at || null,
    }))
    .sort((a, b) => b.used_count - a.used_count);

  // 5) (Opcional) Info del evento
  const event = eventId ? await Events.findByPk(eventId) : null;

  return res.json({
    event: event
      ? { id: event.id, title: event.title, venue: event.venue, starts_at: event.starts_at }
      : null,

    orders: {
      orders_count,
      qty_total,
    },

    payments: {
      payments_count,
      payments_validated_count,
      amount_total_all,
      amount_total_validated,
    },

    tickets: {
      totalTickets,
      usedTickets,
      unusedTickets,
      voidTickets,
    },

    used_by_staff,
  });
});

module.exports = { getDashboard };
