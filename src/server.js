const app = require('./app');
const sequelize = require('./utils/connection');
const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 8080;


const main = async () => {
    try {
        // Sincronizar bases de datos
        await sequelize.sync();
        console.log("DB connected");
        console.log("DBM connected");

        // Crear servidor HTTP
        const server = http.createServer(app);

        // Crear instancia de Socket.IO
        const io = new Server(server, {
            cors: {
                origin: "*", // O la URL de tu frontend: "http://localhost:5173"
                methods: ["GET", "POST", "PUT", "DELETE"],
            },
        });

        // Guardar io en app para que las rutas lo puedan usar
        app.set("io", io);

        // Eventos de Socket.IO
        io.on("connection", (socket) => {
            console.log("Nuevo cliente conectado:", socket.id);

            socket.on("join:event", ({ eventId }) => {
                if (eventId) {
                    socket.join(`event:${eventId}`);
                    console.log(`Socket ${socket.id} joined event:${eventId}`);
                }
            });

            socket.on("leave:event", ({ eventId }) => {
                if (eventId) {
                    socket.leave(`event:${eventId}`);
                    console.log(`Socket ${socket.id} left event:${eventId}`);
                }
            });

            socket.on("disconnect", () => {
                console.log("Cliente desconectado:", socket.id);
            });
        });


        // Iniciar servidor
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Error al iniciar servidor:", error);
    }
};

main();
