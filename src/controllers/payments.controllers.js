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
    subject: "🍖 Hemos recibido tu comprobante - Pedido de Hornado",
    html: `
<div style="margin:0;padding:0;background:#fff4df;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:650px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(120,60,20,.18);">

    <!-- Imagen -->
    <div style="background:linear-gradient(135deg,#7a2e12,#c85d20);">
      <img
        src="https://res.cloudinary.com/desgmhmg4/image/upload/v1784256827/hornado_u9yqnq.png"
        alt="Hornado"
        style="width:100%;display:block;"
      />
    </div>

    <!-- Encabezado -->
    <div style="padding:28px 24px;text-align:center;background:#fffaf2;">

      <div style="display:inline-block;padding:8px 16px;border-radius:30px;
                  background:#fff0c7;
                  border:1px solid #f3c765;
                  color:#8a420d;
                  font-weight:bold;
                  font-size:13px;">
        ⏳ PAGO EN VALIDACIÓN
      </div>

      <h2 style="margin:18px 0 8px;color:#7a2e12;font-size:30px;">
        🍖 ¡Recibimos tu comprobante!
      </h2>

      <p style="margin:0;font-size:16px;color:#6d5548;">
        Hola <strong>${order.buyer_name}</strong>,
      </p>

      <p style="margin:14px 0 0;color:#6d5548;font-size:15px;line-height:1.6;">
        Hemos recibido correctamente tu comprobante de pago para tu pedido de hornado.
      </p>

      <h3 style="margin:16px 0 0;color:#8f3608;font-size:22px;">
        ${event?.title || "Venta de Hornado"}
      </h3>

    </div>

    <!-- Resumen -->
    <div style="padding:24px;background:#fffaf2;">

      <div style="background:#ffffff;border:1px solid #efd4aa;border-radius:12px;padding:20px;">

        <h3 style="margin-top:0;color:#8f3608;">
          📋 Resumen de tu pedido
        </h3>

        <table style="width:100%;font-size:15px;border-collapse:collapse;">

          <tr>
            <td style="padding:8px 0;color:#6f5b4d;">Pedido</td>
            <td style="padding:8px 0;text-align:right;font-family:monospace;">
              ${order.id}
            </td>
          </tr>

          <tr>
            <td style="padding:8px 0;color:#6f5b4d;">Estado</td>
            <td style="padding:8px 0;text-align:right;">
              <strong style="color:#d07a00;">
                En validación
              </strong>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 0;color:#6f5b4d;">Boletos</td>
            <td style="padding:8px 0;text-align:right;">
              ${order.quantity}
            </td>
          </tr>

          <tr>
            <td style="padding:8px 0;color:#6f5b4d;">Total</td>
            <td style="padding:8px 0;text-align:right;">
              <strong>$${amount} ${currency || "USD"}</strong>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 0;color:#6f5b4d;">Fecha</td>
            <td style="padding:8px 0;text-align:right;">
              ${new Date().toLocaleString("es-EC")}
            </td>
          </tr>

        </table>

      </div>

      <!-- Información -->
      <div style="margin-top:18px;
                  background:#7a2e12;
                  color:#ffffff;
                  padding:20px;
                  border-radius:12px;
                  text-align:center;">

        <h3 style="margin-top:0;color:#ffd77a;">
          📲 ¿Qué sucede ahora?
        </h3>

        <p style="margin:0;font-size:15px;line-height:1.7;">
          Nuestro equipo verificará tu comprobante de pago.
          <br><br>
          Una vez aprobado, recibirás automáticamente un correo con
          <strong>tu boleto digital y su código QR</strong>.
          <br><br>
          El día de la entrega únicamente deberás presentar ese QR para reclamar tu pedido.
        </p>

      </div>

      <!-- Aviso -->
      <div style="margin-top:18px;
                  background:#fff0c7;
                  border-left:5px solid #df9625;
                  border-radius:10px;
                  padding:18px;
                  color:#6b4413;
                  font-size:14px;
                  line-height:1.6;">

        <strong>⚠️ Importante</strong><br>

        • El código QR se enviará únicamente cuando el pago haya sido validado.<br>
        • Cada QR permite retirar una sola vez el producto adquirido.<br>
        • Si el comprobante presenta inconsistencias nos comunicaremos contigo.

      </div>

    </div>

    <!-- Botones -->
    <div style="padding:26px;text-align:center;background:#f5e3c5;">

      <a href="${proof_url}"
         target="_blank"
         style="display:inline-block;
                margin:8px;
                padding:13px 26px;
                background:#a54814;
                color:white;
                text-decoration:none;
                border-radius:8px;
                font-weight:bold;">

        📄 Ver mi comprobante

      </a>

      <a href="https://wa.me/593998830670"
         target="_blank"
         style="display:inline-block;
                margin:8px;
                padding:13px 26px;
                background:#25D366;
                color:white;
                text-decoration:none;
                border-radius:8px;
                font-weight:bold;">

        📞 Atención al Cliente

      </a>

    </div>

    <!-- Footer -->
    <div style="background:#4d1e0c;padding:18px;text-align:center;color:#f7dcc3;font-size:12px;">
      © ${new Date().getFullYear()} Venta de Hornado · Gracias por apoyar nuestra tradición.
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
    include: [
      {
        model: Orders,
        required: false,
        attributes: ["id", "buyer_name", "buyer_email", "buyer_phone", "quantity", "eventId"],
      },
    ],
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
        const ticketUrl = `https://mr-hornado.kafersolucionesweb.com/ticket/${tk.code}`;
        const qrFilePath = path.join(ticketsDir, `${tk.code}.png`);

        await QRCode.toFile(qrFilePath, ticketUrl, { width: 300, margin: 1 });

        const qrUrl = `${baseUrl}/uploads/tickets/${tk.code}.png`;

        return `
<div style="background:#ffffff;
            border:1px solid #efd4aa;
            border-radius:14px;
            padding:22px;
            margin:18px 0;
            color:#5a351d;">

  <div style="text-align:center;">

    <div style="display:inline-block;
                background:#a54814;
                color:#ffffff;
                padding:8px 18px;
                border-radius:30px;
                font-weight:bold;
                font-size:15px;
                margin-bottom:16px;">
      🍖 BOLETO #${idx + 1}
    </div>

    <div>
      <img
        src="${qrUrl}"
        alt="QR Pedido"
        style="width:220px;
               max-width:100%;
               background:#ffffff;
               border:6px solid #f5e3c5;
               border-radius:12px;
               padding:10px;" />
    </div>

    <div style="margin-top:16px;
                font-size:13px;
                color:#8b5d3c;">
      Código del boleto
    </div>

    <div style="margin-top:6px;
                font-family:monospace;
                font-size:14px;
                font-weight:bold;
                color:#7a2e12;
                word-break:break-word;">
      ${tk.code}
    </div>

    <div style="margin-top:20px;
                padding:18px;
                border-radius:12px;
                background:#fff5dc;
                border-left:5px solid #d88d1b;
                text-align:left;
                color:#6d4a27;
                line-height:1.7;
                font-size:14px;">

      <strong style="color:#8a420d;">
        📲 ¿Cómo reclamar tu pedido?
      </strong>

      <br><br>

      ✔ Presenta este código QR al personal encargado el día de la entrega.

      <br><br>

      ✔ Nuestro equipo escaneará el QR y registrará automáticamente la entrega de tu pedido.

      <br><br>

      ✔ Este boleto es de un solo uso. Una vez escaneado quedará marcado como
      <strong>ENTREGADO</strong> y no podrá utilizarse nuevamente.

      <br><br>

      <span style="font-size:13px;color:#8a6d4d;">
        🔒 No compartas este código QR con otras personas.
      </span>

    </div>

  </div>

</div>
`;
      }),
    );

    // 5.3 Enviar email con entradas
    await sendEmail({
      to: order.buyer_email,
      subject: "🍖 ¡Pago confirmado! Tu boleto de hornado está listo",
      html: `
    <div style="margin:0;padding:0;background-color:#fff4df;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:650px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(91,49,14,.18);">

        <!-- IMAGEN PRINCIPAL -->
        <div style="background:linear-gradient(135deg,#7a2e12,#c65b1e);padding:0;text-align:center;">
          <img
            src="https://res.cloudinary.com/desgmhmg4/image/upload/v1784256827/hornado_u9yqnq.png"
            alt="Hornado ecuatoriano"
            style="display:block;width:100%;max-width:650px;height:auto;border:0;"
          />
        </div>

        <!-- ENCABEZADO -->
        <div style="padding:28px 26px 20px;text-align:center;background-color:#fffaf1;">
          <div style="display:inline-block;padding:8px 16px;background-color:#f5c451;color:#5a260c;border-radius:20px;font-size:13px;font-weight:bold;">
            ✅ PAGO CONFIRMADO
          </div>

          <h1 style="margin:18px 0 8px;color:#7a2e12;font-size:28px;line-height:1.2;">
            ¡Tu hornado está reservado!
          </h1>

          <p style="margin:0;color:#5f493d;font-size:16px;line-height:1.6;">
            Hola <strong style="color:#7a2e12;">${order.buyer_name}</strong>,
            tu compra fue validada correctamente.
          </p>
        </div>

        <!-- DETALLE DE COMPRA -->
        <div style="padding:8px 26px 24px;background-color:#fffaf1;">
          <div style="background-color:#ffffff;border:1px solid #f0d4ad;border-radius:12px;padding:20px;text-align:center;">
            <h2 style="margin:0 0 12px;color:#9a3f14;font-size:21px;">
              🍽️ ${event?.title || "Venta de Hornado"}
            </h2>

            <p style="margin:6px 0;color:#6b5143;font-size:15px;">
              Boletos adquiridos:
              <strong style="color:#7a2e12;">${order.quantity}</strong>
            </p>

            ${event?.date
          ? `
                  <p style="margin:6px 0;color:#6b5143;font-size:15px;">
                    Fecha de entrega:
                    <strong style="color:#7a2e12;">${event.date}</strong>
                  </p>
                `
          : ""
        }

            ${event?.location
          ? `
                  <p style="margin:6px 0;color:#6b5143;font-size:15px;">
                    Lugar:
                    <strong style="color:#7a2e12;">${event.location}</strong>
                  </p>
                `
          : ""
        }
          </div>
        </div>

        <!-- INSTRUCCIONES -->
        <div style="padding:22px 26px;background-color:#7a2e12;color:#ffffff;text-align:center;">
          <h3 style="margin:0 0 10px;font-size:20px;color:#ffd77a;">
            📲 ¿Cómo retirar tu pedido?
          </h3>

          <p style="margin:0;font-size:15px;line-height:1.6;color:#fff8e9;">
            Presenta el código QR de cada boleto al personal encargado.
            Una vez escaneado, el boleto quedará registrado como
            <strong>ENTREGADO</strong> y no podrá volver a utilizarse.
          </p>
        </div>

        <!-- BOLETOS QR -->
        <div style="padding:24px 22px 12px;background-color:#fffaf1;">
          ${ticketCardsHtml.join("")}
        </div>

        <!-- AVISO -->
        <div style="padding:10px 26px 24px;background-color:#fffaf1;">
          <div style="background-color:#fff0c7;border-left:5px solid #e59b23;border-radius:8px;padding:14px;color:#684415;font-size:14px;line-height:1.5;">
            ⚠️ Conserva este correo y no compartas tus códigos QR. Cada boleto permite retirar una sola porción o producto, según tu compra.
          </div>
        </div>

        <!-- CONTACTO -->
        <div style="padding:22px 26px;text-align:center;background-color:#f5e3c5;">
          <p style="margin:0 0 14px;color:#70401f;font-size:14px;">
            ¿Tienes alguna consulta sobre tu pedido?
          </p>

          <a
            href="https://wa.me/593998830670"
            target="_blank"
            style="display:inline-block;padding:13px 24px;background-color:#25D366;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;"
          >
            📞 Contactar Atención al Cliente
          </a>
        </div>

        <!-- PIE -->
        <div style="background-color:#4d1e0c;padding:18px;text-align:center;color:#f5d8bc;font-size:12px;">
          © ${new Date().getFullYear()} Venta de Hornado
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
