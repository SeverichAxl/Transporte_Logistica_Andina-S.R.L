const express = require('express');
const router = express.Router();
const entregaController = require('../controllers/entrega.controller');

router.get('/', entregaController.listar);
router.get('/:id', entregaController.obtenerPorId);

module.exports = router;
