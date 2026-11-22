const express = require('express');
const router = express.Router();
const conductorController = require('../controllers/conductor.controller');

router.get('/', conductorController.listar);
router.get('/:id', conductorController.obtenerPorId);

module.exports = router;
