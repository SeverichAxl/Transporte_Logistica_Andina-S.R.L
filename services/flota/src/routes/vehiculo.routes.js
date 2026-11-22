const express = require('express');
const router = express.Router();
const vehiculoController = require('../controllers/vehiculo.controller');

router.get('/', vehiculoController.listar);
router.get('/:placa', vehiculoController.obtenerPorPlaca);

module.exports = router;
