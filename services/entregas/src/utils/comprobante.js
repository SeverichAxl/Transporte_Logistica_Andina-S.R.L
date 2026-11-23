const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');

/**
 * Genera el PDF del comprobante de entrega (HU-ENT-03) y devuelve
 * el buffer junto con su hash SHA-256.
 *
 * Contenido: número COMP-AAAA-NNNNNN, código de envío, receptor,
 * fecha/hora de entrega y referencia a las evidencias adjuntas.
 *
 * @returns {Promise<{buffer:Buffer, hash:string}>}
 */
function generarPdfComprobante({ nroComprobante, codigoEnvio, entrega, evidencias = [] }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Comprobante ${nroComprobante}` } });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        resolve({ buffer, hash });
      });
      doc.on('error', reject);

      // Encabezado
      doc.fontSize(18).font('Helvetica-Bold').text('COMPROBANTE DE ENTREGA', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').fillColor('#555555')
        .text('Transporte Logística Andina S.R.L.', { align: 'center' });
      doc.moveDown(1.5);

      // Número de comprobante
      doc.fontSize(12).fillColor('#000000').font('Helvetica-Bold')
        .text(`N° ${nroComprobante}`, { align: 'center' });
      doc.moveDown(1.5);

      // Datos del envío
      _seccion(doc, 'Datos del envío');
      _fila(doc, 'Código de seguimiento', codigoEnvio);
      _fila(doc, 'ID de envío', String(entrega.id_envio));

      // Receptor
      _seccion(doc, 'Receptor');
      _fila(doc, 'Nombre', entrega.nombre_receptor);
      if (entrega.documento_receptor) _fila(doc, 'Documento', entrega.documento_receptor);

      // Entrega
      _seccion(doc, 'Entrega');
      _fila(doc, 'Fecha y hora', _formatearFecha(entrega.fecha_hora_entrega));
      if (entrega.id_conductor) _fila(doc, 'ID conductor (snapshot)', String(entrega.id_conductor));
      if (entrega.id_vehiculo) _fila(doc, 'ID vehículo (snapshot)', String(entrega.id_vehiculo));
      if (entrega.observaciones) _fila(doc, 'Observaciones', entrega.observaciones);

      // Evidencias
      _seccion(doc, `Evidencias adjuntas (${evidencias.length})`);
      if (!evidencias.length) {
        doc.fontSize(10).font('Helvetica').fillColor('#555555')
          .text('Sin evidencias fotográficas registradas.', { indent: 10 });
      } else {
        evidencias.forEach((ev, i) => {
          doc.fontSize(10).font('Helvetica').fillColor('#000000')
            .text(`${i + 1}. ${ev.nombre_archivo}`, { indent: 10 });
        });
      }

      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').fillColor('#888888')
        .text(
          'Documento generado electrónicamente. El hash SHA-256 del PDF se almacena en la base de datos para verificar su integridad.',
          { align: 'justify' }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function _seccion(doc, titulo) {
  doc.moveDown(0.8);
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a3c6e').text(titulo);
  doc.moveDown(0.3);
}

function _fila(doc, etiqueta, valor) {
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text(`${etiqueta}: `, { continued: true });
  doc.font('Helvetica').text(String(valor ?? '-'));
}

function _formatearFecha(valor) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleString('es-BO', { timeZone: 'America/La_Paz' });
}

/**
 * Escribe el PDF en disco y devuelve la URL accesible vía gateway.
 * Se monta también bajo /api/v1/entregas/uploads en index.js para que
 * el path funcione a través del gateway (puerto 3000).
 */
async function guardarPdf(buffer, nroComprobante, uploadsDir) {
  const dir = path.join(uploadsDir, 'comprobantes');
  fs.mkdirSync(dir, { recursive: true });
  const nombreArchivo = `${nroComprobante}.pdf`;
  const ruta = path.join(dir, nombreArchivo);
  fs.writeFileSync(ruta, buffer);
  return {
    ruta,
    urlPdf: `/api/v1/entregas/uploads/comprobantes/${nombreArchivo}`
  };
}

module.exports = { generarPdfComprobante, guardarPdf };
