# Módulo de Centros de Costo — Guía de Integración

## Propósito

El módulo de **Centros de Costo** permite clasificar los gastos operativos del tenant en unidades organizativas (ej. `CC-ENG` Ingeniería, `CC-MKT` Marketing, `CC-ADM` Administración) y asignarles presupuestos mensuales controlados.

Cada centro de costo y cada presupuesto pertenecen a un único tenant y están aislados por Row Level Security (RLS).

## Alcance

- CRUD de centros de costo.
- CRUD de presupuestos mensuales por centro de costo.
- Estados: `active`, `inactive`.
- Soft-delete: los registros eliminados conservan `deleted_at`.
- Cálculo de `remaining_budget = allocated_budget - committed_amount - spent_amount`.

## Relaciones con otros módulos

| Módulo | Relación |
|--------|----------|
| `auth` | `actor_id` del usuario autenticado se registra en `audit.logs`. |
| `audit` | Cada escritura genera una entrada en `audit.logs` con `entity_type = 'cost_center'` o `'cost_center_budget'`. |
| `treasury` | En futuras fases los payables/expenses podrán vincularse a un centro de costo y descontar del presupuesto. |

## Flujo recomendado para el frontend

1. Crear centro de costo con `POST /api/v1/cost-centers`.
2. Asignar presupuesto mensual con `POST /api/v1/cost-centers/{id}/budgets`.
3. Listar centros de costo con `GET /api/v1/cost-centers`.
4. Editar centro de costo con `PUT /api/v1/cost-centers/{id}`.
5. Consultar presupuestos con `GET /api/v1/cost-centers/{id}/budgets`.

## Roles y permisos

Todas las rutas requieren autenticación y pertenencia a un tenant. Solo usuarios con rol **OWNER** o **ADMIN** pueden acceder.

## Endpoints

### Recurso: Cost Centers

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/cost-centers` | Listar centros de costo. |
| `POST` | `/api/v1/cost-centers` | Crear centro de costo. |
| `GET` | `/api/v1/cost-centers/{id}` | Obtener centro de costo. |
| `PUT` | `/api/v1/cost-centers/{id}` | Actualizar centro de costo. |
| `DELETE` | `/api/v1/cost-centers/{id}` | Eliminación lógica. |

#### `POST /api/v1/cost-centers`

**Request body:**

```json
{
  "code": "CC-ENG",
  "name": "Ingeniería",
  "description": "Gastos de equipos de desarrollo",
  "is_active": true,
  "status": "active"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `code` | string | Sí | Máx. 30 caracteres. Único por tenant. |
| `name` | string | Sí | Máx. 100 caracteres. |
| `description` | string | No | Texto libre. |
| `is_active` | bool | No | Default `true`. |
| `status` | string | No | `active` o `inactive`. Default `active`. |

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "cost_center": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5",
      "code": "CC-ENG",
      "name": "Ingeniería",
      "description": "Gastos de equipos de desarrollo",
      "is_active": true,
      "status": "active",
      "created_at": "2026-08-01T00:00:00Z",
      "updated_at": "2026-08-01T00:00:00Z",
      "deleted_at": null
    }
  },
  "meta": {
    "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5"
  }
}
```

#### `GET /api/v1/cost-centers`

**Query params opcionales:**

- `status`: filtra por estado (`active`, `inactive`).
- `search`: búsqueda parcial por `code` o `name`.
- `limit`: cantidad de resultados (default `20`).
- `offset`: paginación (default `0`).

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "items": [
      { "cost_center": { ... } }
    ],
    "total": 1
  },
  "meta": {
    "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5"
  }
}
```

#### `PUT /api/v1/cost-centers/{id}`

Solo se envían los campos a modificar. Todos son opcionales.

**Response 200 OK:** devuelve el centro de costo completo actualizado.

#### `DELETE /api/v1/cost-centers/{id}`

**Response 200 OK:**

```json
{
  "success": true,
  "data": {},
  "meta": {
    "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5"
  }
}
```

### Recurso: Cost Center Budgets

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/cost-centers/{id}/budgets` | Listar presupuestos del centro. |
| `POST` | `/api/v1/cost-centers/{id}/budgets` | Crear presupuesto. |
| `GET` | `/api/v1/cost-centers/{id}/budgets/{budget_id}` | Obtener presupuesto. |
| `PUT` | `/api/v1/cost-centers/{id}/budgets/{budget_id}` | Actualizar presupuesto. |
| `DELETE` | `/api/v1/cost-centers/{id}/budgets/{budget_id}` | Eliminación lógica. |

#### `POST /api/v1/cost-centers/{id}/budgets`

**Request body:**

```json
{
  "period_year": 2026,
  "period_month": 8,
  "allocated_budget": 10000.00,
  "committed_amount": 2500.00,
  "spent_amount": 1000.00,
  "currency": "PEN"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `period_year` | int | Sí | Rango 2000-2100. |
| `period_month` | int | Sí | 1-12. |
| `allocated_budget` | float | Sí | ≥ 0. |
| `committed_amount` | float | No | ≥ 0. Default `0`. |
| `spent_amount` | float | No | ≥ 0. Default `0`. |
| `currency` | string | Sí | ISO-4217, ej. `PEN`, `USD`. |

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "budget": {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5",
      "cost_center_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "period_year": 2026,
      "period_month": 8,
      "allocated_budget": 10000.00,
      "committed_amount": 2500.00,
      "spent_amount": 1000.00,
      "currency": "PEN",
      "created_at": "2026-08-01T00:00:00Z",
      "updated_at": "2026-08-01T00:00:00Z",
      "deleted_at": null
    }
  },
  "meta": {
    "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5"
  }
}
```

#### `GET /api/v1/cost-centers/{id}/budgets`

**Query params opcionales:**

- `limit`, `offset` — paginación.

**Response 200 OK:** `{ "items": [...], "total": N }`.

## Tipos de error

| Código HTTP | Código de error | Cuándo ocurre |
|-------------|-----------------|---------------|
| 400 | `validation_error` | Body inválido, `status` no válido, `period_month` fuera de rango, montos negativos. |
| 401 | `unauthorized` | Token ausente, inválido o expirado. |
| 403 | `forbidden` | Usuario sin rol OWNER/ADMIN o `tenant_id` inválido. |
| 404 | `not_found` | Centro de costo o presupuesto no existe. |
| 409 | `conflict` | Ya existe un centro con el mismo `code` o un presupuesto para el mismo período. |
| 500 | `internal_server_error` | Error inesperado del servidor. |

## Notas técnicas

- `code` es único por tenant.
- Un centro de costo solo puede tener un presupuesto por período (`period_year`, `period_month`).
- Los montos se almacenan con 2 decimales (`NUMERIC(15,2)`).
- Los campos nulos se serializan como `null` explícito.
- Los listados vacíos retornan `200 OK` con `items: []`.
- Las operaciones de escritura generan auditoría.

## Archivos relacionados

- `migrations/0017_cost_centers_schema.sql`
- `migrations/0018_cost_centers_rls_policy.sql`
- `internal/cost_centers/domain/entity.go`
- `internal/cost_centers/repository/repository.go`
- `internal/cost_centers/repository/postgres/cost_center_postgres.go`
- `internal/cost_centers/usecase/usecases.go`
- `internal/cost_centers/transport/http_handlers.go`
