const catchError = require("../utils/catchError");
const sendEmail = require("../utils/sendEmail");
const Contactanos = require("../models/Contactanos");

const getAll = catchError(async (req, res) => {
  const results = await Contactanos.findAll({
    where: { is_active: true },
    order: [["createdAt", "DESC"]],
  });
  return res.json(results);
});

const create = catchError(async (req, res) => {
  // 1) guardar en DB
  const { email, nombres, mensaje, telefono, asunto } = req.body;

  if (!email || !nombres || !mensaje) {
    return res.status(400).json({
      message: "Faltan datos: email, nombres, mensaje",
    });
  }

  const northEmail = process.env.NORTH_EMAIL;

  const ip =
    req.headers["x-forwarded-for"]?.split(",")?.[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;

  const user_agent = req.headers["user-agent"] || null;

  const result = await Contactanos.create({
    email,
    nombres,
    mensaje,
    telefono: telefono || null,
    asunto: asunto || null,
    ip,
    user_agent,
    is_read: false,
    read_at: null,
    is_active: true,
  });

  // 2) correo al admin
  await sendEmail({
    to: northEmail,
    subject: "Nuevo contacto desde NORTH EVENTS",
    html: `
      <div style="margin:0;padding:0;background-color:#0d0221;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:640px;margin:0 auto;background-color:#140032;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.35);">

          <div style="background:linear-gradient(90deg,#1f0036,#3a0066);padding:26px;text-align:center;">
            <img src="https://res.cloudinary.com/desgmhmg4/image/upload/v1771055860/north_logo_ghuajx.png"
                 alt="NORTH EVENTS"
                 style="width:170px;max-width:100%;" />
          </div>

          <div style="padding:24px 26px;color:#ffffff;">
            <h2 style="margin:0 0 10px 0;color:#ff4df0;text-align:center;">
              📩 Nuevo contacto desde la web
            </h2>

            <div style="margin-top:16px;background:#1e0045;border-radius:10px;padding:16px;">
              <p style="margin:0 0 8px 0;"><b>Nombre:</b> ${nombres}</p>
              <p style="margin:0 0 8px 0;"><b>Correo:</b> ${email}</p>
              <p style="margin:0 0 8px 0;"><b>Teléfono:</b> ${telefono || "—"}</p>
              <p style="margin:0 0 8px 0;"><b>Asunto:</b> ${asunto || "—"}</p>
              <p style="margin:14px 0 8px 0;"><b>Mensaje:</b></p>

              <div style="background:#140032;border:1px solid rgba(255,255,255,0.12);padding:14px;border-radius:10px;color:#dddddd;line-height:1.6;white-space:pre-wrap;">
                ${mensaje}
              </div>

              <div style="margin-top:12px;font-size:12px;color:#bfbfbf;">
                <div><b>ID:</b> ${result.id}</div>
                <div><b>IP:</b> ${ip || "—"}</div>
                <div><b>User-Agent:</b> ${user_agent ? user_agent.slice(0, 180) : "—"}</div>
              </div>
            </div>

            <p style="margin:16px 0 0 0;font-size:12px;color:#bfbfbf;text-align:center;">
              Este mensaje fue generado automáticamente desde el formulario de contacto de NORTH EVENTS.
            </p>
          </div>

          <div style="background-color:#0d0221;padding:16px;text-align:center;color:#888;font-size:12px;">
            © ${new Date().getFullYear()} NORTH EVENTS
          </div>

        </div>
      </div>
    `,
  });

  // 3) correo de confirmación al usuario
  await sendEmail({
    to: email,
    subject: "Hemos recibido tu mensaje - NORTH EVENTS",
    html: `
      <div style="margin:0;padding:0;background-color:#0d0221;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:640px;margin:0 auto;background-color:#140032;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.35);">

          <div style="background:linear-gradient(90deg,#1f0036,#3a0066);padding:26px;text-align:center;">
            <img src="https://res.cloudinary.com/desgmhmg4/image/upload/v1771055860/north_logo_ghuajx.png"
                 alt="NORTH EVENTS"
                 style="width:170px;max-width:100%;" />
          </div>

          <div style="padding:26px;color:#ffffff;text-align:center;">
            <h2 style="margin:0;color:#ff4df0;">¡Hola ${nombres}!</h2>

            <p style="margin:12px 0 0 0;font-size:16px;line-height:1.6;color:#dddddd;">
              Gracias por escribirnos. Hemos recibido tu mensaje y en breve nuestro equipo se pondrá en contacto contigo.
            </p>

            <div style="margin:18px auto 0 auto;max-width:520px;background:#1e0045;border-radius:10px;padding:16px;text-align:left;">
              <div style="font-size:13px;color:#bfbfbf;margin-bottom:6px;"><b>Tu mensaje:</b></div>
              <div style="background:#140032;border:1px solid rgba(255,255,255,0.12);padding:14px;border-radius:10px;color:#dddddd;line-height:1.6;white-space:pre-wrap;">
                ${mensaje}
              </div>
            </div>

            <p style="margin:18px 0 0 0;font-size:13px;color:#bfbfbf;">
              Mientras tanto, síguenos en redes para enterarte de próximos eventos y lanzamientos.
            </p>
          </div>

          <div style="background-color:#0d0221;padding:16px;text-align:center;color:#888;font-size:12px;">
            © ${new Date().getFullYear()} NORTH EVENTS
          </div>

        </div>
      </div>
    `,
  });

  return res.status(201).json(result);
});

const getOne = catchError(async (req, res) => {
  const { id } = req.params;
  const result = await Contactanos.findByPk(id);
  if (!result) return res.sendStatus(404);
  return res.json(result);
});

const remove = catchError(async (req, res) => {
  const { id } = req.params;

  // mejor soft delete (papelera)
  const [rows, updated] = await Contactanos.update(
    { is_active: false },
    { where: { id }, returning: true }
  );

  if (rows === 0) return res.sendStatus(404);
  return res.json({ message: "Enviado a papelera", contact: updated[0] });
});

const update = catchError(async (req, res) => {
  const { id } = req.params;

  const [rows, updated] = await Contactanos.update(req.body, {
    where: { id },
    returning: true,
  });

  if (rows === 0) return res.sendStatus(404);
  return res.json(updated[0]);
});

module.exports = {
  getAll,
  create,
  getOne,
  remove,
  update,
};
