# Sistema Integral de Gestión Logística — Transporte y Logística Andina S.R.L.

Plataforma integral basada en **Microservicios** para la administración de envíos nacionales, control de flota vehicular, asignación de conductores con licencias vigentes y confirmación de entregas con evidencias fotográficas y comprobantes digitales.

---

## 🏗️ Estructura del Monorepo

```
hackathon_prueba/
├── docker-compose.yml          # PostgreSQL 16 con esquemas y scripts montados
├── .env.example                # Variables de entorno de referencia
├── .gitignore                  # Exclusiones de git (node_modules, .env, uploads, etc.)
├── package.json                # Orquestación de workspaces y scripts concurrentes
├── db/                         # Scripts DDL y DML de base de datos
│   ├── 01_schema_logistica_andina_v2.sql
│   └── 02_datos_reglas_y_automatizacion_v2.sql
├── docs/                       # Documentación técnica y arquitectónica
│   ├── ARQUITECTURA.md         # Diagramas y decisiones arquitectónicas
│   └── GUIA_DESARROLLO.md      # Puesta en marcha local paso a paso
├── packages/
│   └── shared/                 # Paquete interno de utilidades comunes (@logistica-andina/shared)
│       ├── src/errors/         # ApiError y errorHandler centralizado
│       ├── src/middlewares/    # CorrelationId y requestLogger
│       ├── src/utils/          # Paginación, logger y respuestas estándar
│       ├── src/db/             # createDbPool con aislamiento por esquema
│       └── src/http/           # Cliente HTTP entre servicios con timeouts y reintentos
├── gateway/                    # API Gateway (Express en puerto 3000)
│   └── src/                    # Proxy inverso hacia microservicios y health check agregado
├── services/                   # Microservicios de dominio (Node.js + Express)
│   ├── envios/                 # MS-Envíos (puerto 3001) - Esquema 'envios'
│   ├── flota/                  # MS-Flota (puerto 3002) - Esquema 'flota'
│   ├── conductores/            # MS-Conductores (puerto 3003) - Esquema 'conductores'
│   └── entregas/               # MS-Entregas (puerto 3004) - Esquema 'entregas'
└── frontend/                   # Aplicación Web React 18 + Vite (puerto 5173)
    └── src/                    # Layout corporativo, Navbar, Sidebar y páginas de módulos
```

---

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Iniciar Base de Datos (Docker)
```bash
docker compose up -d
```

### 3. Iniciar todos los servicios y frontend en local
```bash
npm run dev
```

---

## 🌐 Puertos del Entorno Local

| Servicio | Puerto | Descripción |
| :--- | :---: | :--- |
| **Frontend Web** | `5173` | Interfaz React con tema corporativo y navegación modular |
| **API Gateway** | `3000` | Punto de entrada unificado (`/api/v1/*` y `/health`) |
| **MS-Envíos** | `3001` | Módulo Envíos |
| **MS-Flota** | `3002` | Módulo Flota |
| **MS-Conductores** | `3003` | Módulo Conductores |
| **MS-Entregas** | `3004` | Módulo Entregas |
| **PostgreSQL** | `5432` | Base de datos relacional (contenedor Docker) |

---

## 📋 Historias Técnicas Fundacionales Cubiertas en el Esqueleto

- **TEC-01**: Monorepo con estructura estándar (`frontend`, `gateway`, `services/*`, `db`, `docs`), `.env.example`, `.gitignore` y scripts unificados.
- **TEC-02**: `docker-compose.yml` que levanta únicamente PostgreSQL 16 con volumen persistente, healthcheck y carga automática de esquemas DDL y datos iniciales en `/docker-entrypoint-initdb.d`.
- **TEC-04**: Plantilla homogénea de microservicio Express estructurada por capas (`routes`, `controllers`, `services`, `repositories`, pool de `pg`, `GET /health` y manejo central de errores).
- **TEC-05**: Paquete compartido `@logistica-andina/shared` con formato de error estándar (timestamp, status, code, message, path, details), middleware `X-Correlation-Id`, paginador, cliente HTTP y logger.
- **TEC-06**: Comando único `npm run dev` orquestado con `concurrently` para ejecutar Gateway, 4 Microservicios y Frontend.
- **TEC-07**: Esqueleto Frontend en React (Vite + React Router + TanStack Query + Axios), layout corporativo con Sidebar, Navbar de estado e interceptor global de errores.
- **TEC-08**: API Gateway en Express (puerto 3000) con proxy inverso (`http-proxy-middleware`) hacia los microservicios, CORS y endpoint `/health` agregado.
