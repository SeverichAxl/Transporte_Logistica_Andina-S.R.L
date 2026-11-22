# Guía de Puesta en Marcha y Desarrollo Local
**Transporte y Logística Andina S.R.L.**

## 1. Requisitos Previos
- **Node.js**: v18+ (recomendado Node 20 o 24).
- **Docker & Docker Compose**: Para ejecutar el contenedor de base de datos PostgreSQL 16.
- **Git**

---

## 2. Puesta en Marcha Rápida (3 Pasos)

### Paso 1: Instalar dependencias del Monorepo
En la raíz del proyecto:
```bash
npm install
```

### Paso 2: Levantar la Base de Datos
Docker solo se encarga del motor PostgreSQL para mantener el entorno ligero y rápido (TEC-02):
```bash
npm run db:up
# o directamente: docker compose up -d
```
*Esto creará la base de datos `logistica_andina` e inicializará automáticamente los esquemas (`01_schema_logistica_andina_v2.sql`) y los datos de prueba (`02_datos_reglas_y_automatizacion_v2.sql`).*

Para reiniciar la base de datos de manera limpia con datos iniciales:
```bash
npm run db:reset
```

### Paso 3: Arrancar todos los servicios en simultáneo
```bash
npm run dev
```
Este comando levantará con `concurrently`:
1. **API Gateway**: `http://localhost:3000`
2. **MS-Envíos**: `http://localhost:3001`
3. **MS-Flota**: `http://localhost:3002`
4. **MS-Conductores**: `http://localhost:3003`
5. **MS-Entregas**: `http://localhost:3004`
6. **Frontend React**: `http://localhost:5173`

---

## 3. Verificación de Salud del Sistema (Health Checks)

- **Salud agregada del Gateway**:
  ```bash
  curl http://localhost:3000/health
  ```
- **Salud individual de servicios**:
  - Envíos: `http://localhost:3001/health`
  - Flota: `http://localhost:3002/health`
  - Conductores: `http://localhost:3003/health`
  - Entregas: `http://localhost:3004/health`

---

## 4. Endpoints Base Iniciales

Todos los endpoints se consumen a través del API Gateway (`http://localhost:3000/api/v1`):

- **Envíos**:
  - `GET /api/v1/envios?page=1&limit=10&estado=REGISTRADO`
  - `GET /api/v1/envios/:codigo`
- **Flota**:
  - `GET /api/v1/flota?page=1&limit=10&estado=DISPONIBLE`
  - `GET /api/v1/flota/:placa`
- **Conductores**:
  - `GET /api/v1/conductores?page=1&limit=10`
  - `GET /api/v1/conductores/:id`
- **Entregas**:
  - `GET /api/v1/entregas?page=1&limit=10`
  - `GET /api/v1/entregas/:id`
