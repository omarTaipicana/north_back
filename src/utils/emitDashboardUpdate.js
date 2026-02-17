module.exports = function emitDashboardUpdate(req, { eventId, type }) {
  const io = req.app.get("io");
  if (!io) return;

  // 1) Global (dashboard general)
  io.emit("admin:dashboard:update", {
    type: type || "dashboard_update",
    eventId: eventId || null,
  });

  // 2) Por evento (dashboard filtrado)
  if (eventId) {
    io.to(`event:${eventId}`).emit("dashboard:update", {
      type: type || "dashboard_update",
      eventId,
    });
  }
};
