const catchError = require("../utils/catchError");
const Tickets = require("../models/Tickets");
const Events = require("../models/Events");
const StaffUser = require("../models/StaffUser");


const checkin = catchError(async (req, res) => {
    const { code, gate } = req.body;
    if (!code) return res.status(400).json({ message: "Falta code" });

    // 1) Buscar ticket
    const ticket = await Tickets.findOne({ where: { code } });
    if (!ticket) return res.status(404).json({ message: "Ticket no encontrado" });

    // 2) Validar evento (activo + ventana de check-in si la usas)
    const event = await Events.findByPk(ticket.eventId);
    if (!event) return res.status(404).json({ message: "Evento no encontrado" });
    if (!event.is_active) {
        return res.status(403).json({ message: "Evento inactivo" });
    }

    const now = new Date();
    if (event.checkin_opens_at && now < new Date(event.checkin_opens_at)) {
        return res.status(403).json({ message: "Check-in aún no habilitado" });
    }
    if (event.checkin_closes_at && now > new Date(event.checkin_closes_at)) {
        return res.status(403).json({ message: "Check-in cerrado" });
    }

    // 3) ATÓMICO: solo marca si estaba unused
    const [rowsUpdated, updated] = await Tickets.update(
        {
            status: "used",
            used_at: new Date(),
            used_by: req.user.id,      // staff id del JWT
            gate: gate || null,
        },
        {
            where: { id: ticket.id, status: "unused" },
            returning: true,
        }
    );

    // Si no se actualizó, es porque ya estaba used/void
    if (rowsUpdated === 0) {
        const fresh = await Tickets.findByPk(ticket.id);

        if (fresh.status === "used") {

            let staffInfo = null;

            if (fresh.used_by) {
                const staff = await StaffUser.findByPk(fresh.used_by, {
                    attributes: ["id", "full_name", "email", "role"],
                });

                if (staff) {
                    staffInfo = staff;
                }
            }

            return res.status(409).json({
                message: "Entrada ya fue utilizada",
                used_at: fresh.used_at,
                gate: fresh.gate,
                staff: staffInfo,   // 👈 ahora devuelve quién la registró
            });
        }

        return res.status(409).json({
            message: `Entrada no válida (status: ${fresh.status})`,
        });
    }

    const io = req.app.get("io");
    if (io) {
        io.to(`event:${ticket.eventId}`).emit("dashboard:update", {
            type: "checkin",
            eventId: ticket.eventId,
        });
    }



    return res.json({
        message: "✅ Check-in exitoso",
        ticket: updated[0],
        event: {
            id: event.id,
            title: event.title,
            venue: event.venue,
            starts_at: event.starts_at,
        },
    });
});

module.exports = { checkin };
