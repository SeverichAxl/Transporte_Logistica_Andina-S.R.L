# Arquitectura de Software — Sistema Integral de Gestión Logística
**Transporte y Logística Andina S.R.L.**

## 1. Visión General de la Solución
La plataforma adopta el patrón arquitectónico de **Microservicios**, separando responsabilidades operativas en servicios independientes y autónomos, orquestados mediante un **API Gateway** central y consumidos por una aplicación frontend web moderna en **React + Vite**.

```mermaid
flowchart TD
    Client["Navegador Web / Cliente"] -->|Puerto 5173| Frontend["Frontend (React 18 + Vite)"]
    Frontend -->|Puerto 3000 /api/v1/*| Gateway["API Gateway (Express)"]
    
    subgraph Microservicios ["Capa de Microservicios Node.js/Express"]
        Gateway -->|/api/v1/envios (3001)| MSEnvios["MS-Envíos (Puerto 3001)"]
        Gateway -->|/api/v1/flota (3002)| MSFlota["MS-Flota (Puerto 3002)"]
        Gateway -->|/api/v1/conductores (3003)| MSConductores["MS-Conductores (Puerto 3003)"]
        Gateway -->|/api/v1/entregas (3004)| MSEntregas["MS-Entregas (Puerto 3004)"]
    end

    subgraph BaseDatos ["PostgreSQL 16 (Docker)"]
        MSEnvios -->|search_path: envios| DBE["Esquema: envios"]
        MSFlota -->|search_path: flota| DBF["Esquema: flota"]
        MSConductores -->|search_path: conductores| DBC["Esquema: conductores"]
        MSEntregas -->|search_path: entregas| DBD["Esquema: entregas"]
    end
```

---

## 2. Asignación de Puertos y Componentes

| Componente | Tipo | Puerto | Responsabilidad Principal |
| :--- | :--- | :---: | :--- |
| **PostgreSQL (Docker)** | Base de Datos | `5432` | Persistencia relacional con 4 esquemas independientes. |
| **API Gateway** | Gateway / Proxy | `3000` | Punto único de entrada, CORS, propagación de `X-Correlation-Id`, enrutamiento. |
| **MS-Envíos** | Microservicio | `3001` | Registro, seguimiento y trazabilidad de envíos. |
| **MS-Flota** | Microservicio | `3002` | Catálogo de vehículos, estado operativo y capacidad de carga. |
| **MS-Conductores** | Microservicio | `3003` | Conductores, validación de licencias vigentes y asignaciones. |
| **MS-Entregas** | Microservicio | `3004` | Confirmación de entrega, evidencias fotográficas y comprobante PDF. |
| **Frontend** | SPA (Vite + React) | `5173` | Dashboard e interfaz gráfica de usuario. |

---

## 3. Estructura Interna por Capas (TEC-04)
Cada microservicio implementa una arquitectura homogénea y desacoplada:

```
services/<nombre-servicio>/
├── package.json
├── .env.example
└── src/
    ├── index.js                  # Punto de entrada y configuración de Express
    ├── config/
    │   └── db.js                 # Pool de pg con search_path apuntando al esquema propio
    ├── controllers/              # Manejo de peticiones HTTP, status codes y responses
    ├── services/                 # Lógica y validaciones de negocio
    ├── repositories/             # Consultas SQL nativas hacia PostgreSQL
    └── routes/
        ├── health.routes.js      # Endpoint GET /health con verificación de BD
        └── *.routes.js           # Endpoints funcionales del módulo
```

---

## 4. Paquete de Utilidades Compartidas (`packages/shared`)
Garantiza coherencia técnica sin acoplar lógica de negocio (TEC-05):
- **`ApiError` y `errorHandler`**: Manejo centralizado de errores con estructura estándar:
  ```json
  {
    "success": false,
    "error": {
      "timestamp": "2026-11-22T21:00:00.000Z",
      "correlationId": "uuid-...",
      "status": 404,
      "code": "NOT_FOUND",
      "message": "Recurso no encontrado",
      "path": "/api/v1/envios/TLA-9999",
      "details": null
    }
  }
  ```
- **`correlationIdMiddleware`**: Inyecta y propaga `X-Correlation-Id` a través de todas las capas.
- **`pagination`**: Utilidades `getPaginationParams` y `buildPaginatedResponse`.
- **`createDbPool`**: Inicialización controlada de pools con `search_path` aislado por microservicio.
- **`httpClient`**: Wrapper de Axios con timeout, reintentos y traducción de caídas a HTTP 502/503.
