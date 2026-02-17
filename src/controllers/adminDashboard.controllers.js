const catchError = require("../utils/catchError");
const { fn, col } = require("sequelize");
const Events = require("../models/Events");
const Orders = require("../models/Orders");
const Payments = require("../models/Payments");
const Tickets = require("../models/Tickets");

const getDashboard = catchError(async (req, res) => {
  const { eventId } = req.query;

  const whereTickets = eventId ? { eventId } : {};
  const whereOrders = eventId ? { eventId } : {};

  // 1) Tickets
  const [totalTickets, usedTickets, unusedTickets, voidTickets] =
    await Promise.all([
      Tickets.count({ where: whereTickets }),
      Tickets.count({ where: { ...whereTickets, status: "used" } }),
      Tickets.count({ where: { ...whereTickets, status: "unused" } }),
      Tickets.count({ where: { ...whereTickets, status: "void" } }),
    ]);

  // 2) Orders por status (esto sí existe en Orders)
  const ordersByStatusRaw = await Orders.findAll({
    where: whereOrders,
    attributes: ["status", [fn("COUNT", col("id")), "count"]],
    group: ["status"],
    raw: true,
  });

  const ordersByStatus = ordersByStatusRaw.reduce((acc, row) => {
    acc[row.status] = Number(row.count || 0);
    return acc;
  }, {});

  // 3) Payments (NO existe status -> usamos is_validated + is_active)
  // Filtramos por evento con include a Orders
  const paymentsTotalCount = await Payments.count({
    where: { is_active: true },
    include: [
      {
        model: Orders,
        attributes: [],
        where: whereOrders,
        required: true,
      },
    ],
  });

  const paymentsValidatedCount = await Payments.count({
    where: { is_active: true, is_validated: true },
    include: [
      {
        model: Orders,
        attributes: [],
        where: whereOrders,
        required: true,
      },
    ],
  });

  const amountTotalAll = await Payments.sum("amount", {
    where: { is_active: true },
    include: [
      {
        model: Orders,
        attributes: [],
        where: whereOrders,
        required: true,
      },
    ],
  });

  const amountTotalValidated = await Payments.sum("amount", {
    where: { is_active: true, is_validated: true },
    include: [
      {
        model: Orders,
        attributes: [],
        where: whereOrders,
        required: true,
      },
    ],
  });

  // Si quieres seguir usando paymentsByStatus en frontend, lo armamos "falso" por boolean:
  const paymentsByStatus = {
    pending: Number(amountTotalAll || 0) - Number(amountTotalValidated || 0),
    validated: Number(amountTotalValidated || 0),
  };

  // revenue = solo validados
  const revenue = Number(amountTotalValidated || 0);

  const soldTickets = usedTickets + unusedTickets;

  const orders_count = await Orders.count({ where: whereOrders });
  const qty_total = await Orders.sum("quantity", { where: whereOrders });

  res.json({
    filter: { eventId: eventId || null },
    tickets: {
      totalTickets,
      soldTickets,
      usedTickets,
      unusedTickets,
      voidTickets,
    },
    ordersByStatus,

    // ✅ estructura útil real (recomendada)
    payments: {
      payments_count: paymentsTotalCount,
      payments_validated_count: paymentsValidatedCount,
      amount_total_all: Number(amountTotalAll || 0),
      amount_total_validated: Number(amountTotalValidated || 0),
    },

    // ✅ si aún quieres mostrar algo tipo "byStatus"
    paymentsByStatus,
    revenue,
    orders: {
      orders_count,
      qty_total: Number(qty_total || 0),
    },
  });
});

const getDashboardEventsSummary = catchError(async (req, res) => {
  // 1) Tickets total por evento
  const ticketsTotalAgg = await Tickets.findAll({
    attributes: ["eventId", [fn("COUNT", col("id")), "totalTickets"]],
    group: ["eventId"],
    raw: true,
  });

  // 2) Tickets usados por evento
  const ticketsUsedAgg = await Tickets.findAll({
    attributes: ["eventId", [fn("COUNT", col("id")), "usedTickets"]],
    where: { status: "used" },
    group: ["eventId"],
    raw: true,
  });

  // 3) Revenue por evento (solo pagos validados y activos)
  // IMPORTANTE: esto requiere que tengas la asociación Payments.belongsTo(Orders, { as: "order" })
  const revenueAgg = await Payments.findAll({
    attributes: [
      [col("order.eventId"), "eventId"],
      [fn("SUM", col("amount")), "revenue"],
    ],
    include: [{ model: Orders, as: "order", attributes: [], required: true }],
    where: { is_active: true, is_validated: true },
    group: [col("order.eventId")],
    raw: true,
  });

  // 4) Events para nombres (usa title, no name)
  const events = await Events.findAll({
    attributes: ["id", "title"],
    raw: true,
  });

  const mapTotal = new Map(ticketsTotalAgg.map((r) => [r.eventId, r]));
  const mapUsed = new Map(ticketsUsedAgg.map((r) => [r.eventId, r]));
  const mapRev = new Map(revenueAgg.map((r) => [r.eventId, r]));

  const summary = events.map((ev) => {
    const t = mapTotal.get(ev.id) || {};
    const u = mapUsed.get(ev.id) || {};
    const r = mapRev.get(ev.id) || {};
    return {
      eventId: ev.id,
      name: ev.title, // tu frontend espera row.name
      totalTickets: Number(t.totalTickets || 0),
      usedTickets: Number(u.usedTickets || 0),
      revenue: Number(r.revenue || 0),
    };
  });

  res.json(summary);
});

module.exports = { getDashboard, getDashboardEventsSummary };
