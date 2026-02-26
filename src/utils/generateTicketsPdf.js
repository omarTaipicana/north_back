const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

async function generateTicketsPdf({ order, tickets, event, baseUrl }) {
  // Plantilla por ID del evento
  const templatePath = path.join(
    process.cwd(),
    "uploads",
    "template_ticket",
    `${event.id}.pdf`
  );

  if (!fs.existsSync(templatePath)) {
    throw new Error(`No existe la plantilla: ${templatePath}`);
  }

  const templateBytes = fs.readFileSync(templatePath);
  const templatePdf = await PDFDocument.load(templateBytes);

  const outPdf = await PDFDocument.create();
  const fontReg = await outPdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await outPdf.embedFont(StandardFonts.HelveticaBold);

  // Colores (modelo)
  const purple = rgb(1, 0.302, 0.941); // aprox #ff4df0
  const black = rgb(0.05, 0.05, 0.08);

  // --- Coordenadas exactas del MODELO (A4 595 x 842) ---
  // PDF-lib usa origen abajo-izquierda (0,0).
  const POS = {
    eventTitle: { x: 44, y: 842 - 440.94, size: 14, font: fontReg, color: black },

    venue: { x: 44, y: 842 - 462.34, size: 11, font: fontReg, color: black },
    date: { x: 44, y: 842 - 479.34, size: 11, font: fontReg, color: black },

    buyer: { x: 44, y: 842 - 512.34, size: 11, font: fontReg, color: black },
    email: { x: 44, y: 842 - 529.33, size: 11, font: fontReg, color: black },
    order: { x: 44, y: 842 - 546.33, size: 11, font: fontReg, color: black },

    codeLabel: { x: 60, y: 842 - 634.43, size: 12, font: fontReg, color: purple },
    codeValue: { x: 60, y: 842 - 656.82, size: 14, font: fontReg, color: black },

    hint: { x: 60, y: 842 - 688.23, size: 11, font: fontReg, color: rgb(0.35, 0.35, 0.35) },
    pageNum: { x: 60, y: 842 - 736.98, size: 10, font: fontReg, color: rgb(0.45, 0.45, 0.45) },

    // QR (bbox detectado del modelo)
    qr: { x: 324, y: 287, size: 230 },
  };

const fechaTxt = event?.starts_at
  ? new Intl.DateTimeFormat("es-EC", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "America/Guayaquil",
    }).format(new Date(event.starts_at))
  : "—";

  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];

    // copiar página 0 del template por cada ticket
    const [page] = await outPdf.copyPages(templatePdf, [0]);
    outPdf.addPage(page);

    // URL del QR
    const ticketUrl = `${baseUrl}/ticket/${encodeURIComponent(t.code)}`;

    // QR PNG
    const qrDataUrl = await QRCode.toDataURL(ticketUrl, {
      errorCorrectionLevel: "H",
      margin: 1,
      scale: 8,
    });
    const qrBase64 = qrDataUrl.split(",")[1];
    const qrBytes = Buffer.from(qrBase64, "base64");
    const qrImg = await outPdf.embedPng(qrBytes);

    // --- Dibujar QR ---
    page.drawImage(qrImg, {
      x: POS.qr.x,
      y: POS.qr.y,
      width: POS.qr.size,
      height: POS.qr.size,
    });

    // --- Dibujar textos (igual al modelo) ---
    page.drawText(String(event?.title || "Evento"), POS.eventTitle);

    page.drawText(`Lugar: ${event?.venue || "—"}`, POS.venue);
    page.drawText(`Fecha: ${fechaTxt}`, POS.date);

    page.drawText(`Comprador: ${order?.buyer_name || "—"}`, POS.buyer);
    page.drawText(`Email: ${order?.buyer_email || "—"}`, POS.email);
    page.drawText(`Orden: ${order?.id || "—"}`, POS.order);

    page.drawText("Código de Ticket", POS.codeLabel);
    page.drawText(String(t.code), POS.codeValue);

    page.drawText("Presenta este QR en el ingreso.", POS.hint);
    page.drawText(`Ticket ${i + 1} de ${tickets.length}`, POS.pageNum);
  }

  const bytes = await outPdf.save();
  return Buffer.from(bytes);
}

module.exports = generateTicketsPdf;