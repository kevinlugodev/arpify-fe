# Changelog de APIs — Módulos ERP (Audit, Cost Centers, Fixed Assets, Expense Claims, HR Payroll, Credit Control, Partner Equity)

## Fecha

2026-08

## Resumen ejecutivo

Se agregaron endpoints `DELETE` faltantes y se corrigió el comportamiento de eliminación para que sea **soft delete en cascada**. Antes, eliminar un registro padre dejaba huérfanos (dependientes visibles después de recrear el padre); ahora los dependientes también se marcan como eliminados.

Se documentan exclusivamente los **cambios y adiciones** respecto a las guías originales de integración.

---

## 1. Partner Equity — Cambios y nuevos endpoints

### 1.1 Eliminar distribución de utilidades

```http
DELETE /api/v1/partner-equity/profit-distributions/{id}
```

**Comportamiento**

- Soft-delete de la distribución.
- Busca todas las transacciones `EARNED_DISTRIBUTION` vinculadas.
- Por cada una revierte el crédito:
  - `accumulated_earnings -= amount`
  - `current_available_balance -= amount`
- Soft-delete de esas transacciones.

**Request body**: ninguno.

**Response 200 OK**

```json
{
  "success": true,
  "data": {},
  "meta": { "tenant_id": "..." }
}
```

---

### 1.2 Eliminar transacción de socio (retiro, liquidación o distribución)

```http
DELETE /api/v1/partner-equity/draw-transactions/{id}
```

**Comportamiento según tipo**

| Tipo                  | Reversión de saldos                                                     |
| --------------------- | ----------------------------------------------------------------------- |
| `ADVANCE_DRAW`        | `current_available_balance += amount`, `total_draws_paid -= amount`     |
| `EARNED_DISTRIBUTION` | `accumulated_earnings -= amount`, `current_available_balance -= amount` |
| `SETTLEMENT_PAYMENT`  | Sin impacto en saldos; solo soft-delete documental                      |

> El egreso bancario original de un `ADVANCE_DRAW` **no se revierte** en Tesorería.
> Si la cuenta de socio asociada ya fue eliminada (soft-delete), la transacción se elimina igualmente sin intentar revertir saldos de una cuenta inactiva.

**Request body**: ninguno.

**Response 200 OK**

```json
{
  "success": true,
  "data": {},
  "meta": { "tenant_id": "..." }
}
```

---

### 1.3 Eliminar cuenta de socio — ahora en cascada

```http
DELETE /api/v1/partner-equity/partner-accounts/{id}
```

**Comportamiento actualizado**

- Soft-delete de la cuenta de socio.
- **Nuevo**: soft-delete atómico de **todas** las transacciones (`partner_draw_transactions`) asociadas a esa cuenta.
- Al recrear una cuenta para el mismo empleado, los movimientos antiguos ya no aparecerán.

---

## 2. Soft delete en cascada en otros módulos

Ahora eliminar un registro padre también marca como eliminados sus dependientes.

### 2.1 Cost Centers

```http
DELETE /api/v1/cost-centers/{id}
```

Al eliminar un centro de costo se eliminan (soft-delete) todos sus budgets:

- Tabla afectada: `cost_centers.cost_center_budgets`

### 2.2 Fixed Assets

```http
DELETE /api/v1/fixed-assets/{id}
```

Al eliminar un activo fijo se eliminan (soft-delete) todos sus logs de depreciación:

- Tabla afectada: `fixed_assets.asset_depreciation_logs`

### 2.3 Expense Claims

```http
DELETE /api/v1/expense-claims/{id}
```

Al eliminar una rendición se eliminan (soft-delete) todos sus ítems:

- Tabla afectada: `expense_claims.expense_claim_items`

> Solo se pueden eliminar rendiciones en estado `DRAFT`.

### 2.4 HR Payroll

```http
DELETE /api/v1/hr-payroll/payroll-runs/{id}
```

Al eliminar una planilla se eliminan (soft-delete) todos sus ítems:

- Tabla afectada: `hr_payroll.payroll_items`

> Solo se pueden eliminar planillas en estado `DRAFT`.

### 2.5 Credit Control

```http
DELETE /api/v1/credit-control/schedules/{id}
```

Al eliminar un schedule se eliminan (soft-delete) todos sus logs de cobranza:

- Tabla afectada: `credit_control.collection_logs`

---

## 3. Migración de base de datos agregada

```text
migrations/0029_cost_centers_add_status.sql
```

**Motivo**: la tabla `cost_centers.cost_centers` no tenía la columna `status` que el dominio y repositorio esperan.

**Cambios**

- Agrega columna `status VARCHAR(30) NOT NULL DEFAULT 'active'`.
- Crea índice por tenant y status.
- Migra registros existentes: `is_active = true` → `active`, `false` → `inactive`.

**Debe ejecutarse en la base de datos** antes de consumir `GET /api/v1/cost-centers`.

---

## 4. Archivos modificados

### Partner Equity

- `internal/partner_equity/repository/repository.go`
- `internal/partner_equity/repository/postgres/partner_equity_postgres.go`
- `internal/partner_equity/usecase/usecases.go`
- `internal/partner_equity/transport/http_handlers.go`
- `docs/partner-equity-api-integration.md`

### Otros módulos (cascada)

- `internal/cost_centers/repository/repository.go`
- `internal/cost_centers/repository/postgres/cost_center_postgres.go`
- `internal/cost_centers/usecase/usecases.go`
- `internal/fixed_assets/repository/repository.go`
- `internal/fixed_assets/repository/postgres/fixed_asset_postgres.go`
- `internal/fixed_assets/usecase/usecases.go`
- `internal/expense_claims/repository/repository.go`
- `internal/expense_claims/repository/postgres/expense_claim_postgres.go`
- `internal/expense_claims/usecase/usecases.go`
- `internal/hr_payroll/repository/repository.go`
- `internal/hr_payroll/repository/postgres/hr_payroll_postgres.go`
- `internal/hr_payroll/usecase/usecases.go`
- `internal/credit_control/repository/repository.go`
- `internal/credit_control/repository/postgres/credit_control_postgres.go`
- `internal/credit_control/usecase/usecases.go`

### Audit

- `internal/audit/repository/postgres.go`
- `internal/audit/service/service.go`
- `internal/audit/transport/http_handlers.go`

### Migraciones

- `migrations/0029_cost_centers_add_status.sql`

---

## 6. Audit — Nuevo endpoint de listado general

Anteriormente `/api/v1/audit` no existía; solo existían los endpoints específicos por entidad o actor.

### 6.1 Listar logs de auditoría

```http
GET /api/v1/audit?entity_type=partner_account&entity_id={uuid}&actor_id={uuid}&action=create&limit=20&offset=0
```

**Query params**

| Parámetro     | Tipo   | Descripción                                                         |
| ------------- | ------ | ------------------------------------------------------------------- |
| `entity_type` | string | Filtra por tipo de entidad, ej. `partner_account`, `expense_claim`. |
| `entity_id`   | uuid   | Filtra por ID de la entidad afectada.                               |
| `actor_id`    | uuid   | Filtra por ID del usuario que realizó la acción.                    |
| `action`      | string | Filtra por acción, ej. `create`, `update`, `delete`, `settle`.      |
| `limit`       | int    | Por defecto `20`.                                                   |
| `offset`      | int    | Por defecto `0`.                                                    |

**Response 200 OK**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "...",
        "tenant_id": "...",
        "entity_type": "payroll_run",
        "entity_id": "...",
        "action": "create",
        "actor_id": "...",
        "changes": {/* json crudo */},
        "reason": null,
        "created_at": "2026-08-03T10:00:00Z",
        "action_label": "Creación",
        "entity_type_label": "Planilla",
        "description": "Creación de Planilla - 2026-08"
      }
    ],
    "total": 100
  },
  "meta": { "tenant_id": "..." }
}
```

**Campos enriquecidos**

| Campo                | Descripción                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| `action_label`       | Etiqueta legible de la acción, ej. `Creación`, `Actualización`, `Eliminación`.       |
| `entity_type_label`  | Etiqueta legible del tipo de entidad, ej. `Planilla`, `Cuenta de socio`.             |
| `entity_description` | Nombre o identificador legible del objeto afectado, ej. `2026-08`, `RG-2026-0001`.   |
| `description`        | Descripción completa generada automáticamente, ej. `Creación de Planilla - 2026-08`. |
| `actor_email`        | Correo electrónico del usuario que ejecutó la acción.                                |

`entity_description` se extrae del payload `changes` usando campos como `name`, `code`, `claim_number`, `distribution_code`, `title`, `first_name`/`last_name` o `period_year`/`period_month`.

> Los campos `entity_id` y `actor_id` siguen presentes en la respuesta por compatibilidad, pero el frontend puede ignorarlos y usar `entity_description` y `actor_email`.

---

## 7. Verificación

```bash
go build -buildvcs=false ./...
go vet -buildvcs=false ./...
go test -buildvcs=false ./...
```

Todos los comandos pasan correctamente.
