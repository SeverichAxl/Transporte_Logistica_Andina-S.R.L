const express = require('express');
const router = express.Router();
const conductorController = require('../controllers/conductor.controller');

// Rutas específicas antes de /:id (el id es numérico, pero se declara primero por claridad)
router.get('/alertas/licencias', conductorController.alertasLicencias);
router.get('/resumen', conductorController.resumen);

router.get('/', conductorController.listar);
router.post('/', conductorController.crear);

// :id restringido a dígitos para no capturar rutas fijas como "resumen"
router.get('/:id(\\d+)', conductorController.obtenerPorId);
router.put('/:id(\\d+)', conductorController.actualizar);
router.get('/:id(\\d+)/licencias', conductorController.listarLicencias);
router.post('/:id(\\d+)/licencias', conductorController.renovarLicencia);

module.exports = router;
