const express = require('express');
const router = express.Router();
const envioController = require('../controllers/envio.controller');

// HU-ENV-01: Registrar nuevo envío
router.post('/', envioController.crear);

// HU-ENV-03: Consultar envíos con filtros y paginación
router.get('/', envioController.listar);

// Consulta por ID
router.get('/id/:id', envioController.obtenerPorId);

// HU-ENV-03: Consulta pública / directa por código de seguimiento (ej: TLA-2026-000001)
router.get('/:codigo', envioController.obtenerPorCodigo);

// HU-ENV-02: Modificar envío (rechaza si está EN_TRANSITO, ENTREGADO o CANCELADO)
router.put('/:id', envioController.modificar);

// HU-ENV-04: Cambiar estado respetando transiciones válidas
router.patch('/:id/estado', envioController.cambiarEstado);

module.exports = router;
