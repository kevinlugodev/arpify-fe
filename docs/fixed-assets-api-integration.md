# Módulo de Activos Fijos — Guía de Integración

## Propósito

El módulo de **Activos Fijos** permite registrar activos capitalizables (equipos, muebles, vehículos, maquinaria), asignarles una vida útil y ejecutar depreciación lineal mensual que reduce el valor contable del activo.

Cada activo y cada registro de depreciación pertenecen a un único tenant y están aislados por Row Level Security (RLS).

## Alcance

- CRUD de activos fijos.
- Ejecución de depreciación lineal por período (año/mes).
- Listado de histórico de depreciación por activo.
- Estados: `ACTIVE`, `FULLY_DEPRECIATED`, `DISPOSED`.
- Soft-delete: los registros eliminados conservan `deleted_at`.

## Relaciones con otros módulos

| Módulo | Relación |
|--------|----------|
| `auth` | `actor_id` del usuario autenticado se registra en `audit.logs`. |
| `audit` | Cada escritura genera una entrada en `audit.logs` con `entity_type = 'fixed_asset'` o `'asset_depreciation_log'`. |
| `teams` | `assigned_employee_id` referencia opcionalmente a `teams.team_members.id`. |
| `finance` | La depreciación acumulada y el valor contable alimentan cálculos contables y tributarios futuros. |

## Flujo recomendado para el frontend

1. Crear activo con `POST /api/v1/fixed-assets`.
2. Ejecutar depreciación mensual con `POST /api/v1/fixed-assets/{id}/depreciate`.
3. Consultar histórico con `GET /api/v1/fixed-assets/{id}/depreciation-logs`.
4. Listar activos con `GET /api/v1/fixed-assets`.

## Roles y permisos

Todas las rutas requieren autenticación y pertenencia a un tenant. Solo usuarios con rol **OWNER** o **ADMIN** pueden acceder.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/fixed-assets` | Listar activos fijos. |
| `POST` | `/api/v1/fixed-assets` | Crear activo fijo. |
| `GET` | `/api/v1/fixed-assets/{id}` | Obtener activo fijo. |
| `PUT` | `/api/v1/fixed-assets/{id}` | Actualizar activo fijo. |
| `DELETE` | `/api/v1/fixed-assets/{id}` | Eliminación lógica. |
| `POST` | `/api/v1/fixed-assets/{id}/depreciate` | Ejecutar depreciación del período. |
| `GET` | `/api/v1/fixed-assets/{id}/depreciation-logs` | Listar depreciaciones del activo. |
| `GET` | `/api/v1/fixed-assets/{id}/depreciation-logs/{log_id}` | Obtener depreciación. |

### `POST /api/v1/fixed-assets`

**Request body:**

```json
{
  "asset_code": "AST-LAP-001",
  "name": "MacBook Pro M3",
  "category": "IT_EQUIPMENT",
  "purchase_date": "2026-01-15",
  "purchase_cost": 8000.00,
  "residual_value": 800.00,
  "useful_life_months": 36,
  "assigned_employee_id": "6f30a022-2f5f-442c-b9a7-d782a4c3e578",
  "status": "ACTIVE"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `asset_code` | string | Sí | Máx. 50 caracteres. Único por tenant. |
| `name` | string | Sí | Máx. 150 caracteres. |
| `category` | string | Sí | `IT_EQUIPMENT`, `FURNITURE`, `VEHICLES`, `MACHINERY`, `OTHER`. |
| `purchase_date` | string | Sí | `YYYY-MM-DD`. |
| `purchase_cost` | float | Sí | ≥ 0. |
| `residual_value` | float | Sí | ≥ 0 y ≤ `purchase_cost`. |
| `useful_life_months` | int | Sí | > 0. |
| `assigned_employee_id` | uuid | No | Debe existir en `teams.team_members`. |
| `status` | string | No | `ACTIVE`, `FULLY_DEPRECIATED`, `DISPOSED`. Default `ACTIVE`. |

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "fixed_asset": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5",
      "asset_code": "AST-LAP-001",
      "name": "MacBook Pro M3",
      "category": "IT_EQUIPMENT",
      "purchase_date": "2026-01-15T00:00:00Z",
      "purchase_cost": 8000.00,
      "residual_value": 800.00,
      "useful_life_months": 36,
      "accumulated_depreciation": 0.00,
      "current_book_value": 8000.00,
      "assigned_employee_id": "6f30a022-2f5f-442c-b9a7-d782a4c3e578",
      "status": "ACTIVE",
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

#### `POST /api/v1/fixed-assets/{id}/depreciate`

**Request body:**

```json
{
  "period_year": 2026,
  "period_month": 7
}
```

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "log": {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5",
      "fixed_asset_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "period_year": 2026,
      "period_month": 7,
      "depreciation_amount": 200.00,
      "accumulated_total_after": 200.00,
      "book_value_after": 7800.00,
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

**Reglas:**

- `monthly_depreciation = (purchase_cost - residual_value) / useful_life_months`.
- No se deprecia si el activo no está `ACTIVE`.
- No se deprecia más allá del `residual_value`.
- No se permite depreciar dos veces el mismo período.
- Si el `current_book_value` llega al `residual_value`, el estado cambia a `FULLY_DEPRECIATED`.

#### `GET /api/v1/fixed-assets`

**Query params opcionales:**

- `status`: filtra por estado.
- `category`: filtra por categoría.
- `search`: búsqueda parcial por `asset_code` o `name`.
- `limit`, `offset`: paginación.

**Response 200 OK:** `{ "items": [...], "total": N }`.

## Tipos de error

| Código HTTP | Código de error | Cuándo ocurre |
|-------------|-----------------|---------------|
| 400 | `validation_error` | Body inválido, `purchase_cost` negativo, `residual_value` > `purchase_cost`, período ya depreciado, activo no activo. |
| 401 | `unauthorized` | Token ausente, inválido o expirado. |
| 403 | `forbidden` | Usuario sin rol OWNER/ADMIN o `tenant_id` inválido. |
| 404 | `not_found` | Activo, depreciación o empleado asignado no existe. |
| 409 | `conflict` | Ya existe un activo con el mismo `asset_code` o depreciación para el mismo período. |
| 500 | `internal_server_error` | Error inesperado del servidor. |

## Notas técnicas

- `asset_code` es único por tenant.
- La depreciación se ejecuta dentro de una transacción: actualiza el activo e inserta el log.
- Los montos se almacenan con 2 decimales (`NUMERIC(15,2)`).
- Los campos nulos se serializan como `null` explícito.
- Los listados vacíos retornan `200 OK` con `items: []`.
- Las operaciones de escritura generan auditoría.

## Archivos relacionados

- `migrations/0019_fixed_assets_schema.sql`
- `migrations/0020_fixed_assets_rls_policy.sql`
- `internal/fixed_assets/domain/entity.go`
- `internal/fixed_assets/repository/repository.go`
- `internal/fixed_assets/repository/postgres/fixed_asset_postgres.go`
- `internal/fixed_assets/usecase/usecases.go`
- `internal/fixed_assets/transport/http_handlers.go`
