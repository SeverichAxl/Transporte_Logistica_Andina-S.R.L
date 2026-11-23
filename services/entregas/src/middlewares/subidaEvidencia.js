const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { ApiError } = require('@logistica-andina/shared');

/**
 * Subida de evidencias fotográficas (HU-ENT-02).
 * Reglas: JPG/PNG, máximo 5 MB por archivo, de 1 a 5 fotos por entrega.
 * El máximo de 5 también lo refuerza un trigger en BD (trg_evidencia_limite).
 */

const uploadsDir = process.env.UPLOADS_DIR || path.resolve(__dirname, '../../uploads');
const evidenciasDir = path.join(uploadsDir, 'evidencias');
fs.mkdirSync(evidenciasDir, { recursive: true });

const MIME_PERMITIDOS = ['image/jpeg', 'image/png'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, evidenciasDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const unico = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    cb(null, `evidencia-${unico}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (MIME_PERMITIDOS.includes(file.mimetype)) return cb(null, true);
    return cb(
      ApiError.unprocessableEntity(
        `Tipo de archivo no permitido: ${file.mimetype}. Solo se admiten JPG y PNG`,
        { campo: 'fotos', permitidos: MIME_PERMITIDOS },
        'TIPO_ARCHIVO_NO_PERMITIDO'
      )
    );
  }
});

/**
 * Envuelve multer para traducir sus errores a ApiError con códigos claros.
 */
function subirFotos(req, res, next) {
  upload.array('fotos', 5)(req, res, (err) => {
    if (!err) return next();

    if (err.name === 'MulterError') {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          ApiError.unprocessableEntity(
            'Cada foto no puede superar los 5 MB',
            { campo: 'fotos', limiteBytes: 5 * 1024 * 1024 },
            'ARCHIVO_SUPERA_TAMANO'
          )
        );
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return next(
          ApiError.unprocessableEntity(
            'Una entrega admite como máximo 5 fotos de evidencia',
            { campo: 'fotos', maximo: 5 },
            'MAXIMO_EVIDENCIAS'
          )
        );
      }
      return next(
        ApiError.badRequest(`Error al subir las fotos: ${err.message}`, { campo: 'fotos' }, 'ERROR_SUBIDA')
      );
    }
    return next(err);
  });
}

module.exports = { subirFotos, evidenciasDir, uploadsDir };
