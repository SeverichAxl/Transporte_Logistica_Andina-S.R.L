const vehiculoRepository = require('../repositories/vehiculo.repository');
const { ApiError, buildPaginatedResponse } = require('@logistica-andina/shared');

class VehiculoService {
  async crearVehiculo(datos, usuario = 'flota') {
    const { placa, marca, modelo, anio, capacidadCargaKg, categoriaLicenciaRequerida } = datos;

    if (!placa || !marca || !modelo || !anio || !capacidadCargaKg) {
      throw ApiError.badRequest('Placa, marca, modelo, año y capacidad de carga son obligatorios');
    }

    const placaNorm = placa.toUpperCase().trim();
    const vehiculoExistente = await vehiculoRepository.findByPlaca(placaNorm);
    if (vehiculoExistente) {
      throw ApiError.conflict(`Ya existe un vehículo registrado con la placa ${placaNorm}`);
    }

    const anioNum = parseInt(anio, 10);
    if (isNaN(anioNum) || anioNum < 1980 || anioNum > 2100) {
      throw ApiError.badRequest('El año del vehículo debe estar comprendido entre 1980 y 2100');
    }

    const capacidad = parseFloat(capacidadCargaKg);
    if (isNaN(capacidad) || capacidad <= 0) {
      throw ApiError.badRequest('La capacidad de carga debe ser un valor numérico mayor a 0 kg');
    }

    return vehiculoRepository.createVehiculo({
      placa: placaNorm,
      marca: marca.trim(),
      modelo: modelo.trim(),
      anio: anioNum,
      capacidadCargaKg: capacidad,
      categoriaLicenciaRequerida: categoriaLicenciaRequerida || null,
      usuario
    });
  }

  async listarVehiculos({ page, limit, offset, estado, placa, capacidadMin, soloActivos = true }) {
    const [items, total, metricas] = await Promise.all([
      vehiculoRepository.findAll({ limit, offset, estado, placa, capacidadMin, soloActivos }),
      vehiculoRepository.countAll({ estado, placa, capacidadMin, soloActivos }),
      vehiculoRepository.getMetricas()
    ]);
    const paginacion = buildPaginatedResponse(items, total, page, limit);
    return { ...paginacion, metricas };
  }

  async obtenerPorId(id) {
    const vehiculo = await vehiculoRepository.findById(id);
    if (!vehiculo) {
      throw ApiError.notFound(`Vehículo con ID ${id} no encontrado`);
    }
    const historial = await vehiculoRepository.getHistorial(id);
    return { ...vehiculo, historial };
  }

  async obtenerPorPlaca(placa) {
    const vehiculo = await vehiculoRepository.findByPlaca(placa);
    if (!vehiculo) {
      throw ApiError.notFound(`Vehículo con placa ${placa} no encontrado`);
    }
    const historial = await vehiculoRepository.getHistorial(vehiculo.id_vehiculo);
    return { ...vehiculo, historial };
  }

  async modificarVehiculo(id, datos, usuario = 'flota') {
    const vehiculo = await vehiculoRepository.findById(id);
    if (!vehiculo) {
      throw ApiError.notFound(`Vehículo con ID ${id} no encontrado`);
    }

    if (datos.anio !== undefined) {
      const anioNum = parseInt(datos.anio, 10);
      if (isNaN(anioNum) || anioNum < 1980 || anioNum > 2100) {
        throw ApiError.badRequest('El año del vehículo debe estar entre 1980 y 2100');
      }
      datos.anio = anioNum;
    }

    if (datos.capacidadCargaKg !== undefined) {
      const cap = parseFloat(datos.capacidadCargaKg);
      if (isNaN(cap) || cap <= 0) {
        throw ApiError.badRequest('La capacidad de carga debe ser mayor a 0 kg');
      }
      datos.capacidadCargaKg = cap;
    }

    await vehiculoRepository.updateVehiculo(id, datos);
    return this.obtenerPorId(id);
  }

  async cambiarEstado(id, datos = {}, usuario = 'flota') {
    const { nuevoEstado, estado, motivo } = datos;
    const targetStateRaw = nuevoEstado || estado;

    const vehiculo = await vehiculoRepository.findById(id);
    if (!vehiculo) {
      throw ApiError.notFound(`Vehículo con ID ${id} no encontrado`);
    }

    if (!motivo || !motivo.trim()) {
      throw ApiError.badRequest('El motivo del cambio de estado operativo es obligatorio (HU-FLO-04)');
    }

    if (!targetStateRaw) {
      throw ApiError.badRequest('Debe indicar el nuevoEstado');
    }

    let targetEstado;
    if (typeof targetStateRaw === 'number' || !isNaN(parseInt(targetStateRaw, 10))) {
      const idNum = parseInt(targetStateRaw, 10);
      const codigos = { 1: 'DISPONIBLE', 2: 'EN_RUTA', 3: 'MANTENIMIENTO', 4: 'FUERA_SERVICIO' };
      targetEstado = { id_estado: idNum, codigo: codigos[idNum] };
    } else {
      targetEstado = await vehiculoRepository.getEstadoByCodigo(targetStateRaw);
    }

    if (!targetEstado) {
      throw ApiError.badRequest(`Estado '${targetStateRaw}' no válido`);
    }

    if (vehiculo.id_estado === targetEstado.id_estado) {
      return this.obtenerPorId(id); // Idempotente si ya está en ese estado
    }

    await vehiculoRepository.updateEstado(id, {
      idEstadoAnterior: vehiculo.id_estado,
      idEstadoNuevo: targetEstado.id_estado,
      motivo: motivo.trim(),
      usuario
    });

    return this.obtenerPorId(id);
  }

  async darDeBaja(id, { motivo }, usuario = 'flota') {
    const vehiculo = await vehiculoRepository.findById(id);
    if (!vehiculo) {
      throw ApiError.notFound(`Vehículo con ID ${id} no encontrado`);
    }

    if (!vehiculo.activo) {
      throw ApiError.badRequest('El vehículo ya se encuentra dado de baja');
    }

    // Regla HU-FLO-03: No dar de baja si está EN_RUTA (2) -> 409 CONFLICT
    if (vehiculo.id_estado === 2 || vehiculo.estado_codigo === 'EN_RUTA') {
      throw ApiError.conflict('No se puede dar de baja un vehículo que se encuentra EN_RUTA');
    }

    await vehiculoRepository.bajaLogica(id, {
      motivo: motivo || 'Baja definitiva de la flota operativa',
      usuario
    });

    return this.obtenerPorId(id);
  }
}

module.exports = new VehiculoService();
