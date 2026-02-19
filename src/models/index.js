const Events = require("./Events");
const Orders = require("./Orders");
const Payments = require("./Payments");
const Tickets = require("./Tickets");



Orders.belongsTo(Events);
Events.hasMany(Orders);

Payments.belongsTo(Orders);
Orders.hasOne(Payments);

// Orders -> Tickets (una orden tiene muchas entradas)
Tickets.belongsTo(Orders);
Orders.hasMany(Tickets);

// Events -> Tickets (un evento tiene muchas entradas)
Tickets.belongsTo(Events);
Events.hasMany(Tickets);

Tickets.belongsTo(StaffUser, { foreignKey: "used_by", as: "usedByStaff" });
StaffUser.hasMany(Tickets, { foreignKey: "used_by", as: "usedTickets" });