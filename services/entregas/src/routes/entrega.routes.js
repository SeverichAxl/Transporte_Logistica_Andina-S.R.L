const express = require('express');
const router = express.Router();
const entregaController = require('../controllers/entrega.controller');
const { subirFotos } = require('../middlewares/subidaEvidencia');

// Rutas específicas antes de /:id
router.get('/resumen', entregaController.resumen);

router.get('/', entregaController.listar);
router.post('/', entregaController.confirmar);

// :id restringido a dígitos para no capturar rutas fijas como "resumen"
router.get('/:id(\\d+)', entregaController.obtenerPorId);

router.get('/:id(\\d+)/evidencias', entregaController.listarEvidencias);
router.post('/:id(\\d+)/evidencias', subirFotos, entregaController.subirEvidencias);

router.post('/:id(\\d+)/comprobante', entregaController.generarComprobante);
router.get('/:id(\\d+)/comprobante', entregaController.descargarComprobante);

module.exports = router;
