const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

async function generateTicketsPdf({ order, tickets, event, baseUrl }) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];

      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      for (let i = 0; i < tickets.length; i++) {
        const t = tickets[i];

        if (i > 0) doc.addPage();

        // URL que abrirá el QR (tu TicketStatus)
        const ticketUrl = `${baseUrl}/ticket/${encodeURIComponent(t.code)}`;

        // QR como DataURL PNG
        const qrDataUrl = await QRCode.toDataURL(ticketUrl, {
          errorCorrectionLevel: "H",
          margin: 1,
          scale: 8,
        });

        const qrBase64 = qrDataUrl.split(",")[1];
        const qrBuffer = Buffer.from(qrBase64, "base64");

        // ===== Estilo “entrada” simple (puedes afinar para copiar tu correo) =====
        doc
          .roundedRect(40, 40, 515, 760, 16)
          .lineWidth(2)
          .stroke("#ff4df0");

        doc.fontSize(22).fillColor("#140032").text("NORTH EVENTS", 60, 65, {
          align: "left",
        });

        doc.fontSize(14).fillColor("#0b0320").text(event?.title || "Evento", 60, 100);

        doc
          .fontSize(11)
          .fillColor("#333")
          .text(`Lugar: ${event?.venue || "—"}`, 60, 125)
          .text(
            `Fecha: ${
              event?.starts_at ? new Date(event.starts_at).toLocaleString("es-EC") : "—"
            }`,
            60,
            142
          );

        doc
          .fontSize(11)
          .fillColor("#333")
          .text(`Comprador: ${order?.buyer_name || "—"}`, 60, 175)
          .text(`Email: ${order?.buyer_email || "—"}`, 60, 192)
          .text(`Orden: ${order?.id}`, 60, 209);

        // QR centrado
        doc.image(qrBuffer, 170, 270, { width: 260 });

        doc
          .fontSize(12)
          .fillColor("#140032")
          .text("Código de Ticket", 60, 560);

        doc
          .fontSize(14)
          .fillColor("#0b0320")
          .text(t.code, 60, 580);

        doc
          .fontSize(11)
          .fillColor("#555")
          .text("Presenta este QR en el ingreso.", 60, 615);

        doc
          .fontSize(10)
          .fillColor("#777")
          .text(`Ticket ${i + 1} de ${tickets.length}`, 60, 735);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = generateTicketsPdf;
