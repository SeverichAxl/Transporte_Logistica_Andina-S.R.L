const express = require('express');
const router = express.Router();
const vehiculoController = require('../controllers/vehiculo.controller');

// HU-FLO-01: Registrar vehículo
router.post('/', vehiculoController.crear);

// HU-FLO-05 y FE-FLO-01: Listar vehículos con filtros y métricas
router.get('/', vehiculoController.listar);

// Consulta por ID
router.get('/id/:id', vehiculoController.obtenerPorId);
router.get('/vehiculos/:id', vehiculoController.obtenerPorId);

// Consulta por placa
router.get('/:placa', vehiculoController.obtenerPorPlaca);

// HU-FLO-02: Modificar datos de vehículo
router.put('/:id', vehiculoController.modificar);

// HU-FLO-04: Cambiar estado operativo con motivo
router.patch('/:id/estado', vehiculoController.cambiarEstado);
router.patch('/vehiculos/:id/estado', vehiculoController.cambiarEstado);

// HU-FLO-03: Baja lógica (pasa a FUERA_SERVICIO)
router.delete('/:id', vehiculoController.darDeBaja);
router.patch('/:id/baja', vehiculoController.darDeBaja);

module.exports = router;
