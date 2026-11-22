const express = require('express');
const router = express.Router();
const envioController = require('../controllers/envio.controller');

// GET /api/v1/envios (o / cuando se monta en el prefijo)
router.get('/', envioController.listar);
router.get('/:codigo', envioController.obtenerPorCodigo);

module.exports = router;
