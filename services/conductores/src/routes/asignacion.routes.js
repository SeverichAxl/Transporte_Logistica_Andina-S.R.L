const express = require('express');
const router = express.Router();
const asignacionController = require('../controllers/asignacion.controller');

router.get('/', asignacionController.listar);
router.post('/', asignacionController.crear);
router.get('/:id(\\d+)', asignacionController.obtenerPorId);
router.patch('/:id(\\d+)/finalizar', asignacionController.finalizar);
router.patch('/:id(\\d+)/cancelar', asignacionController.cancelar);

module.exports = router;
