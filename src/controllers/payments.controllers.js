const catchError = require("../utils/catchError");
const crypto = require("crypto");
const QRCode = require("qrcode");
const Payments = require("../models/Payments");
const Orders = require("../models/Orders");
const Events = require("../models/Events");
const Tickets = require("../models/Tickets");
const sequelize = require("../utils/connection");
const sendEmail = require("../utils/sendEmail");
const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");
const emitDashboardUpdate = require("../utils/emitDashboardUpdate");

const create = catchError(async (req, res) => {
  const proof_url = req.fileUrl;

  if (!req.file || !proof_url) {
    return res
      .status(400)
      .json({ message: "Debes subir un archivo comprobante" });
  }

  const { orderId, bank_name, deposit_id, amount, currency } = req.body;

  if (!orderId || !amount) {
    return res.status(400).json({
      message: "Faltan datos: orderId, bank_name, deposit_id, amount",
    });
  }

  const order = await Orders.findByPk(orderId);
  if (!order) return res.status(404).json({ message: "Orden no encontrada" });

  const exists = await Payments.findOne({ where: { orderId } });
  if (exists) {
    return res
      .status(409)
      .json({ message: "Esta orden ya tiene un pago registrado" });
  }

  const result = await Payments.create({
    orderId,
    bank_name,
    deposit_id,
    amount,
    currency: currency || "USD",
    proof_url,
    is_validated: false,
    validated_at: null,
    validated_by: null,
  });

  // 🔵 Obtener evento para mostrar nombre en correo
  const event = await Events.findByPk(order.eventId);

  // 📧 Enviar correo sencillo
  await sendEmail({
    to: order.buyer_email,
    subject: "🎟️ Hemos recibido tu comprobante - NORTH EVENTS",
    html: `
  <div style="margin:0;padding:0;background-color:#0d0221;font-family:Arial,Helvetica,sans-serif;">
    
    <!-- Contenedor principal -->
    <div style="max-width:600px;margin:0 auto;background-color:#140032;border-radius:12px;overflow:hidden;">
      
      <!-- Header con logo -->
      <div style="background:linear-gradient(90deg,#1f0036,#3a0066);padding:30px;text-align:center;">
        <img src="https://res.cloudinary.com/desgmhmg4/image/upload/v1771055860/north_logo_ghuajx.png"
             alt="NORTH EVENTS"
             style="width:180px;max-width:100%;" />
      </div>

      <!-- Hero -->
      <div style="padding:30px;color:#ffffff;text-align:center;">
        <h2 style="margin:0;font-size:24px;color:#ff4df0;">
          🎉 ¡Recibimos tu comprobante!
        </h2>
        <p style="margin-top:15px;font-size:16px;color:#cccccc;">
          Hola <strong>${order.buyer_name}</strong>,
        </p>
        <p style="font-size:16px;line-height:1.6;color:#dddddd;">
          Hemos recibido tu comprobante de pago para el evento:
        </p>
        <h3 style="margin:10px 0 20px 0;font-size:22px;color:#ffffff;">
          ${event?.title || "Evento NORTH"}
        </h3>
      </div>

      <!-- Detalles -->
      <div style="background-color:#1e0045;padding:25px;color:#ffffff;">
        <p><strong>Monto:</strong> $${amount}</p>
        <p style="margin-top:15px;color:#ff4df0;">
          ⏳ Nuestro equipo validará tu pago en breve.
        </p>
        <p style="font-size:14px;color:#cccccc;">
          Una vez validado, recibirás tus entradas digitales con código QR por este mismo correo.
        </p>
      </div>

      <!-- Botones -->
      <div style="padding:30px;text-align:center;background-color:#140032;">
        
        <a href="${proof_url}" 
           target="_blank"
           style="display:inline-block;margin:10px;padding:12px 24px;
                  background-color:#ff4df0;color:#ffffff;
                  text-decoration:none;border-radius:6px;
                  font-weight:bold;">
          🔎 Ver mi comprobante
        </a>

        <br/>

<a href="https://wa.me/593997808994" 
   target="_blank"
   style="display:inline-block;margin:10px;padding:12px 24px;
          background-color:#3a0066;color:#ffffff;
          text-decoration:none;border-radius:6px;
          font-weight:bold;">
  📞 Contactar Atención al Cliente
</a>


      </div>

      <!-- Footer -->
      <div style="background-color:#0d0221;padding:20px;text-align:center;color:#888;font-size:12px;">
        © ${new Date().getFullYear()} NORTH EVENTS<br/>
        Vive la experiencia. Siente la música.
      </div>

    </div>

  </div>
  `,
  });

  emitDashboardUpdate(req, {
    eventId: order.eventId,
    type: "payment_validated",
  });

  return res.status(201).json(result);
});

const getAll = catchError(async (req, res) => {
  const { trash } = req.query;

  // trash=true => papelera => is_active=false
  // default => activos => is_active=true
  const isTrash = trash === "true";

  const where = {
    is_active: !isTrash, // activos(true) o papelera(false)
  };

  const results = await Payments.findAll({
    where,
    order: [["createdAt", "DESC"]],
  });

  return res.json(results);
});

const getOne = catchError(async (req, res) => {
  const { id } = req.params;
  const result = await Payments.findByPk(id);
  if (!result) return res.sendStatus(404);
  return res.json(result);
});

const update = catchError(async (req, res) => {
  const { id } = req.params;

  // 1) Traer pago ANTES
  const pagoAntes = await Payments.findByPk(id);
  if (!pagoAntes)
    return res.status(404).json({ message: "Pago no encontrado" });

  const wasValidated = !!pagoAntes.is_validated;

  // 2) Aplicar update (bank_name, deposit_id, is_validated, is_active, etc.)
  //    Ojo: como bank_name/deposit_id pueden ser null, solo los tomamos del body si vienen.
  const {
    bank_name,
    deposit_id,
    is_validated,
    is_active, // si agregaste este campo
    validated_by, // opcional
    amount, // si decides permitir editarlo
    currency, // idem
  } = req.body;

  // Calculamos valores finales (como quedarán después)
  const finalIsValidated =
    is_validated !== undefined
      ? is_validated === true || is_validated === "true"
      : pagoAntes.is_validated;

  const finalBankName =
    bank_name !== undefined ? bank_name : pagoAntes.bank_name;
  const finalDepositId =
    deposit_id !== undefined ? deposit_id : pagoAntes.deposit_id;

  // ✅ Validación: banco + id depósito no pueden repetirse
  if (
    finalBankName &&
    String(finalBankName).trim() !== "" &&
    finalDepositId &&
    String(finalDepositId).trim() !== ""
  ) {
    const existe = await Payments.findOne({
      where: {
        bank_name: finalBankName,
        deposit_id: finalDepositId,
        id: { [Op.ne]: id }, // excluye este mismo pago
      },
    });

    if (existe) {
      return res.status(400).json({
        message:
          "Ya existe un pago registrado con ese comprobante (mismo banco e ID).",
      });
    }
  }

  // 3) Si están intentando VALIDAR (false->true), obligamos banco e id depósito
  if (!wasValidated && finalIsValidated) {
    if (!finalBankName || !String(finalBankName).trim()) {
      return res
        .status(400)
        .json({ message: "Para validar, debes registrar bank_name" });
    }
    if (!finalDepositId || !String(finalDepositId).trim()) {
      return res
        .status(400)
        .json({ message: "Para validar, debes registrar deposit_id" });
    }
  }

  // 4) Guardar update del pago
  //    Aquí puedes permitir solo ciertos campos (más seguro).
  const [rows, updated] = await Payments.update(
    {
      ...(bank_name !== undefined ? { bank_name } : {}),
      ...(deposit_id !== undefined ? { deposit_id } : {}),
      ...(is_active !== undefined ? { is_active } : {}),
      ...(amount !== undefined ? { amount } : {}),
      ...(currency !== undefined ? { currency } : {}),
      ...(is_validated !== undefined ? { is_validated: finalIsValidated } : {}),
      ...(!wasValidated && finalIsValidated
        ? { validated_at: new Date(), validated_by: validated_by || null }
        : {}),
    },
    { where: { id }, returning: true },
  );

  if (rows === 0)
    return res.status(404).json({ message: "Pago no encontrado" });

  const pagoDespues = updated[0];
  const nowValidated = !!pagoDespues.is_validated;

  // 5) Solo si hubo transición false -> true, generar tickets y enviar correo
  if (!wasValidated && nowValidated) {
    const order = await Orders.findByPk(pagoDespues.orderId);
    if (!order) return res.status(404).json({ message: "Orden no encontrada" });

    const event = await Events.findByPk(order.eventId);

    // 5.1 Crear tickets en transacción (y actualizar orden)
    const createdTickets = await sequelize.transaction(async (t) => {
      await order.update({ status: "paid_validated" }, { transaction: t });

      const arr = [];
      for (let i = 0; i < order.quantity; i++) {
        arr.push({
          orderId: order.id,
          eventId: order.eventId,
          code: crypto.randomBytes(32).toString("hex"),
          status: "unused",
        });
      }
      const tickets = await Tickets.bulkCreate(arr, {
        transaction: t,
        returning: true,
      });
      return tickets;
    });

    // 5.2 Generar QRs como archivos (recomendado para emails)
    const baseUrl =
      process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;

    const ticketsDir = path.join(__dirname, "..", "..", "uploads", "tickets");
    if (!fs.existsSync(ticketsDir))
      fs.mkdirSync(ticketsDir, { recursive: true });

    const ticketCardsHtml = await Promise.all(
      createdTickets.map(async (tk, idx) => {
        const ticketUrl = `${baseUrl}/ticket/${tk.code}`;
        const qrFilePath = path.join(ticketsDir, `${tk.code}.png`);

        await QRCode.toFile(qrFilePath, ticketUrl, { width: 300, margin: 1 });

        const qrUrl = `${baseUrl}/uploads/tickets/${tk.code}.png`;

        return `
          <div style="background:#1e0045;border-radius:10px;padding:16px;margin:12px 0;color:#fff;">
            <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;justify-content:center;">
              <div style="text-align:center;">
                <div style="font-weight:bold;color:#ff4df0;margin-bottom:6px;">ENTRADA #${idx + 1}</div>
                <img src="${qrUrl}" alt="QR Ticket"
                  style="width:200px;max-width:100%;border-radius:8px;background:#fff;padding:8px;" />
              </div>
              <div style="min-width:220px;">
                <div style="font-size:14px;color:#ccc;">Código:</div>
                <div style="font-family:monospace;word-break:break-all;">${tk.code}</div>
                <div style="margin-top:10px;font-size:13px;color:#ccc;">
                  En puerta, muestra este QR al staff para registrar tu ingreso.
                </div>
              </div>
            </div>
          </div>
        `;
      }),
    );

    // 5.3 Enviar email con entradas
    await sendEmail({
      to: order.buyer_email,
      subject: "🎟️ ¡Pago validado! Aquí están tus entradas - NORTH EVENTS",
      html: `
        <div style="margin:0;padding:0;background-color:#0d0221;font-family:Arial,Helvetica,sans-serif;">
          <div style="max-width:650px;margin:0 auto;background-color:#140032;border-radius:12px;overflow:hidden;">
            <div style="background:linear-gradient(90deg,#1f0036,#3a0066);padding:28px;text-align:center;">
              <img src="https://res.cloudinary.com/desgmhmg4/image/upload/v1771055860/north_logo_ghuajx.png"
                   alt="NORTH EVENTS" style="width:180px;max-width:100%;" />
            </div>

            <div style="padding:26px;color:#ffffff;text-align:center;">
              <h2 style="margin:0;font-size:24px;color:#ff4df0;">✅ ¡Pago validado!</h2>
              <p style="margin:14px 0 0 0;font-size:16px;color:#dddddd;">
                Hola <strong>${order.buyer_name}</strong>, tus entradas están listas.
              </p>
              <h3 style="margin:14px 0 0 0;font-size:20px;color:#ffffff;">
                ${event?.title || "Evento NORTH"}
              </h3>
              <p style="margin:10px 0 0 0;color:#cccccc;">
                Cantidad de entradas: <strong>${order.quantity}</strong>
              </p>
            </div>

            <div style="padding:0 22px 10px 22px;">
              ${ticketCardsHtml.join("")}
            </div>

<div style="padding:18px 26px;text-align:center;background-color:#140032;">
  <a href="https://wa.me/593997808994" 
     target="_blank"
     style="display:inline-block;margin:8px;padding:12px 22px;
            background-color:#25D366;color:#ffffff;
            text-decoration:none;border-radius:6px;
            font-weight:bold;">
    📞 Contactar Atención al Cliente
  </a>
</div>


            <div style="background-color:#0d0221;padding:18px;text-align:center;color:#888;font-size:12px;">
              © ${new Date().getFullYear()} NORTH EVENTS
            </div>
          </div>
        </div>
      `,
    });

    emitDashboardUpdate(req, {
      eventId: order.eventId,
      type: "payment_created",
    });

    return res.json({
      message: "Pago actualizado, validado y tickets enviados",
      payment: pagoDespues,
      tickets: createdTickets,
    });
  }

  // Si NO hubo transición, solo devolvemos el pago actualizado
  return res.json({
    message: "Pago actualizado",
    payment: pagoDespues,
  });
});

module.exports = { create, getAll, getOne, update };
