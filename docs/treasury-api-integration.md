# Módulo de Tesorería — Guía de Integración

## Propósito

El módulo de **Tesorería y Caja** gestiona el flujo de efectivo real de un tenant: cuentas bancarias, saldos reales, fondos reservados por obligaciones pendientes, cuentas por pagar (RHE, facturas de proveedores, obligaciones tributarias) y los movimientos bancarios que modifican esos saldos.

Su objetivo principal es cerrar la brecha entre:

- **Devengado / compromiso** (obligaciones registradas que aún no se pagan).
- **Flujo de caja** (dinero real que entra y sale de las cuentas).

## Alcance

- Cuentas bancarias y/o cuentas de caja en moneda `PEN` y `USD`.
- Cálculo automático de:
  - `real_balance`: saldo verificado de la cuenta.
  - `reserved_amount`: suma de obligaciones pendientes vinculadas a la cuenta.
  - `available_balance`: `real_balance - reserved_amount` (capacidad líquida real).
- Cuentas por pagar (`Payable`) con soporte para pagos parciales.
- Movimientos bancarios (`BankTransaction`) de tipo:
  - `INFLOW` — ingreso/cobro.
  - `OUTFLOW` — egreso/pago (puede vincularse a un `Payable`).
  - `TRANSFER` — transferencia entre cuentas de la misma moneda.
- Reversión de transacciones para mantener trazabilidad contable (no se borran movimientos confirmados).
- Preparación para conciliación bancaria futura (`operation_number`, `reconciliation_status`).

Cada entidad pertenece a un único tenant y está aislada por Row Level Security (RLS).

---

## Conceptos clave

### Balances de una cuenta

| Métrica | Descripción | Fórmula |
|---------|-------------|---------|
| `real_balance` | Dinero físico verificado en la cuenta. | Se actualiza solo al confirmar un movimiento. |
| `reserved_amount` | Total de obligaciones pendientes vinculadas a la cuenta. | Suma de `net_amount - paid_amount` de payables en `PENDING` o `PARTIALLY_PAID`. |
| `available_balance` | Capacidad líquida para gastos no asignados. | `real_balance - reserved_amount` |

### Accrual vs Cash flow

- **Accrual (Devengado):** crear un `Payable` aumenta `reserved_amount` pero **no** toca `real_balance`.
- **Cash flow:** crear un `BankTransaction` `OUTFLOW` reduce `real_balance`, aumenta `paid_amount` del `Payable` y recalcula `reserved_amount`.

---

## Entidades y relaciones

```text
BankAccount
    │
    ├── Payable (opcional; muchos por cuenta)
    │       └── BankTransaction OUTFLOW (pago parcial o total)
    │
    ├── BankTransaction INFLOW (cobro)
    │
    └── BankTransaction TRANSFER (origen/destino entre cuentas)
```

| Entidad | Descripción |
|---------|-------------|
| `BankAccount` | Cuenta bancaria o caja del tenant. |
| `Payable` | Obligación de pago: RHE, factura de proveedor o liquidación tributaria. |
| `BankTransaction` | Movimiento de dinero real. Nunca se elimina; se revierte con otra transacción. |

---

## Flujo correcto de uso

1. **Crear cuentas bancarias**  
   `POST /api/v1/treasury/bank-accounts`  
   Registrar cada cuenta operativa (BCP, Interbank, caja, etc.).

2. **Registrar obligaciones**  
   `POST /api/v1/treasury/payables`  
   Crear el `Payable` con `document_type`, `gross_amount`, `retention_amount`, `net_amount` y `bank_account_id` opcional.

3. **Ejecutar pagos**  
   `POST /api/v1/treasury/transactions` con `type: OUTFLOW` y `payable_id`.  
   El sistema descuenta `real_balance`, actualiza `paid_amount` y recalcula `reserved_amount`.

4. **Registrar ingresos**  
   `POST /api/v1/treasury/transactions` con `type: INFLOW`.

5. **Transferir entre cuentas**  
   `POST /api/v1/treasury/transactions` con `type: TRANSFER` y `destination_bank_account_id`.  
   Solo se permite entre cuentas de la misma moneda en esta fase.

6. **Revertir errores**  
   `POST /api/v1/treasury/transactions/{id}/reverse`  
   Crea una transacción de extorno, revierte saldos y, si aplica, el `paid_amount` del `Payable`.

---

## Roles y permisos

Todas las rutas requieren autenticación JWT y pertenencia a un tenant. Solo usuarios con rol **OWNER** o **ADMIN** pueden acceder al namespace `/api/v1/treasury`.

Headers requeridos:

- `Authorization: Bearer <access_token>`
- `X-Tenant-Slug: <tenant_slug>` (o `X-Tenant-Id`)
- `Content-Type: application/json`

---

## Formato de fechas

- **Requests:** `YYYY-MM-DD` para `due_date` y `transaction_date`.
- **Responses:** fechas en ISO 8601.

---

## Paginación

Los endpoints de listado soportan:

- `?limit=` — default `20`.
- `?offset=` — default `0`.

La respuesta incluye `items` y `total`.

---

## Enums de dominio

### `Currency`

- `PEN` — Sol peruano.
- `USD` — Dólar estadounidense.

### `TransactionType`

- `INFLOW` — Ingreso.
- `OUTFLOW` — Egreso/pago.
- `TRANSFER` — Transferencia interna.

### `TransactionCategory`

- `CUSTOMER_PAYMENT`
- `SUPPLIER_PAYMENT`
- `RHE_PAYMENT`
- `TAX_PAYMENT`
- `PAYROLL`
- `PARTNER_DRAW`
- `BANK_FEE`
- `INTERNAL_TRANSFER`
- `OTHER`

### `PaymentStatus` (Payable)

- `PENDING` — Pendiente.
- `PARTIALLY_PAID` — Pago parcial.
- `PAID` — Pagado.
- `CANCELLED` — Anulado.

### `ReconciliationStatus`

- `UNRECONCILED` — Sin conciliar.
- `MATCHED` — Conciliado.
- `DISCREPANCY` — Con discrepancia.

### `PayableDocumentType`

- `RHE` — Recibo por honorarios.
- `INVOICE` — Factura de proveedor.
- `TAX_SETTLEMENT` — Liquidación tributaria.

---

## Endpoints

### Recurso: Bank Accounts

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/treasury/bank-accounts` | Listar cuentas. |
| `POST` | `/api/v1/treasury/bank-accounts` | Crear cuenta. |
| `GET` | `/api/v1/treasury/bank-accounts/{id}` | Obtener cuenta. |
| `PUT` | `/api/v1/treasury/bank-accounts/{id}` | Actualizar cuenta. |
| `DELETE` | `/api/v1/treasury/bank-accounts/{id}` | Eliminación lógica. |
| `GET` | `/api/v1/treasury/bank-accounts/{id}/transactions` | Listar transacciones de la cuenta. |

#### `GET /api/v1/treasury/bank-accounts`

- **Query params:**
  - `active_only=true` — solo cuentas activas.
  - `limit`, `offset` — paginación.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5",
        "name": "Cuenta Operativa BCP USD",
        "bank_name": "BCP",
        "account_number": "123-4567890-0-12",
        "cci": "00212345678901234567",
        "currency": "USD",
        "real_balance": 1000.00,
        "reserved_amount": 100.00,
        "is_active": true,
        "created_at": "2026-07-31T00:00:00Z",
        "updated_at": "2026-07-31T00:00:00Z"
      }
    ],
    "total": 1
  },
  "meta": { "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5" }
}
```

El frontend puede calcular `available_balance = real_balance - reserved_amount`.

#### `POST /api/v1/treasury/bank-accounts`

**Request body:**

```json
{
  "name": "Cuenta Operativa BCP USD",
  "bank_name": "BCP",
  "account_number": "123-4567890-0-12",
  "cci": "00212345678901234567",
  "currency": "USD",
  "real_balance": 1000.00,
  "is_active": true
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `name` | string | Sí | Máx. 150 caracteres. Único por tenant. |
| `bank_name` | string | No | Máx. 100 caracteres. |
| `account_number` | string | No | Máx. 50 caracteres. |
| `cci` | string | No | Máx. 50 caracteres. |
| `currency` | string | Sí | `PEN` o `USD`. |
| `real_balance` | float | No | Default `0`. Debe ser ≥ 0. |
| `is_active` | bool | No | Default `true`. |

**Response 201:** objeto `bank_account` completo.

#### `PUT /api/v1/treasury/bank-accounts/{id}`

**Request body:** mismos campos opcionales.

**Response 200:** objeto `bank_account` actualizado.

#### `DELETE /api/v1/treasury/bank-accounts/{id}`

**Response 204:** sin body.

---

### Recurso: Payables

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/treasury/payables` | Listar obligaciones. |
| `POST` | `/api/v1/treasury/payables` | Crear obligación. |
| `GET` | `/api/v1/treasury/payables/{id}` | Obtener obligación. |
| `PUT` | `/api/v1/treasury/payables/{id}` | Actualizar obligación. |
| `DELETE` | `/api/v1/treasury/payables/{id}` | Eliminación lógica. |

#### `GET /api/v1/treasury/payables`

- **Query params:**
  - `status` — filtrar por estado.
  - `limit`, `offset` — paginación.

**Response 200:** `{ "items": [...], "total": N }`.

#### `POST /api/v1/treasury/payables`

**Request body:**

```json
{
  "bank_account_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "document_type": "RHE",
  "document_number": "E001-45",
  "entity_name": "Carlos Ruiz",
  "gross_amount": 100.00,
  "retention_amount": 8.00,
  "net_amount": 92.00,
  "paid_amount": 0,
  "status": "PENDING",
  "due_date": "2026-08-15",
  "notes": "Recibo por honorarios - proyecto X"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `bank_account_id` | uuid | No | Cuenta a la que se asigna la reserva. |
| `document_type` | string | Sí | `RHE`, `INVOICE`, `TAX_SETTLEMENT`. |
| `document_number` | string | No | Máx. 50 caracteres. |
| `entity_name` | string | Sí | Máx. 255 caracteres. |
| `gross_amount` | float | Sí | ≥ 0. |
| `retention_amount` | float | No | ≥ 0 y ≤ `gross_amount`. |
| `net_amount` | float | Sí | ≥ 0. |
| `paid_amount` | float | No | ≥ 0 y ≤ `net_amount`. |
| `status` | string | No | Default `PENDING`. |
| `due_date` | string | No | `YYYY-MM-DD`. |
| `notes` | string | No | Texto libre. |

**Response 201:** objeto `payable` completo.

#### `PUT /api/v1/treasury/payables/{id}`

No se permite editar un `Payable` en estado `PAID` o `CANCELLED`.

**Request body:** campos opcionales.

**Response 200:** objeto `payable` actualizado.

#### `DELETE /api/v1/treasury/payables/{id}`

**Response 204:** sin body.

---

### Recurso: Bank Transactions

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/treasury/transactions` | Crear movimiento. |
| `GET` | `/api/v1/treasury/transactions/{id}` | Obtener movimiento. |
| `POST` | `/api/v1/treasury/transactions/{id}/reverse` | Revertir movimiento. |

#### `POST /api/v1/treasury/transactions`

**Request body — pago de payable (OUTFLOW):**

```json
{
  "bank_account_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "type": "OUTFLOW",
  "category": "RHE_PAYMENT",
  "amount": 92.00,
  "currency": "USD",
  "exchange_rate": 1.0,
  "transaction_date": "2026-07-31",
  "operation_number": "OP-2026-001",
  "payable_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "notes": "Pago RHE Carlos Ruiz"
}
```

**Request body — transferencia interna:**

```json
{
  "bank_account_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "destination_bank_account_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "type": "TRANSFER",
  "category": "INTERNAL_TRANSFER",
  "amount": 500.00,
  "currency": "USD",
  "exchange_rate": 1.0,
  "transaction_date": "2026-07-31",
  "operation_number": "TRX-2026-001",
  "notes": "Transferencia a cuenta de ahorros"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `bank_account_id` | uuid | Sí | Cuenta origen. |
| `destination_bank_account_id` | uuid | Condicional | Requerido solo para `TRANSFER`. |
| `type` | string | Sí | `INFLOW`, `OUTFLOW`, `TRANSFER`. |
| `category` | string | Sí | Ver enum `TransactionCategory`. |
| `amount` | float | Sí | > 0. |
| `currency` | string | Sí | `PEN` o `USD`. |
| `exchange_rate` | float | Sí | > 0. Para misma moneda enviar `1.0`. |
| `transaction_date` | string | Sí | `YYYY-MM-DD`. |
| `operation_number` | string | No | Máx. 100 caracteres. Referencia bancaria. |
| `reconciliation_status` | string | No | Default `UNRECONCILED`. |
| `payable_id` | uuid | No | Solo permitido para `OUTFLOW`. |
| `notes` | string | No | Texto libre. |

**Reglas de negocio:**

- `OUTFLOW` y `TRANSFER` requieren saldo suficiente (`real_balance >= amount`).
- `TRANSFER` solo entre cuentas de la misma moneda.
- `TRANSFER` no puede llevar `payable_id`.
- Si se envía `payable_id`, el monto no puede superar el `remaining_amount` del payable.
- La moneda de la transacción debe coincidir con la moneda de la cuenta origen (a menos que se envíe `exchange_rate` para operaciones cruzadas en fases futuras).

**Response 201:** objeto `bank_transaction` completo.

#### `GET /api/v1/treasury/transactions/{id}`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "bank_transaction": {
      "id": "d4e5f6a7-b8c9-0123-def4-567890123456",
      "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5",
      "bank_account_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "destination_bank_account_id": null,
      "type": "OUTFLOW",
      "category": "RHE_PAYMENT",
      "amount": 92.00,
      "currency": "USD",
      "exchange_rate": 1.0,
      "transaction_date": "2026-07-31T00:00:00Z",
      "operation_number": "OP-2026-001",
      "reconciliation_status": "UNRECONCILED",
      "payable_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "notes": "Pago RHE Carlos Ruiz",
      "reversed_transaction_id": null,
      "created_at": "2026-07-31T12:00:00Z",
      "updated_at": "2026-07-31T12:00:00Z"
    }
  },
  "meta": { "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5" }
}
```

#### `POST /api/v1/treasury/transactions/{id}/reverse`

Crea una transacción de extorno que revierte los saldos y, si aplica, el `paid_amount` del `Payable` vinculado.

**Response 201:** objeto `bank_transaction` de extorno con `reversed_transaction_id` apuntando al original.

---

## Tipos de error

| Código HTTP | Código de error | Cuándo ocurre |
|-------------|-----------------|---------------|
| 400 | `validation_error` | Body inválido, enum inválido, `amount <= 0`, `exchange_rate <= 0`, falta `destination_bank_account_id` en transferencia. |
| 401 | `unauthorized` | Token ausente, inválido o expirado. |
| 403 | `forbidden` | Usuario sin rol OWNER/ADMIN o `tenant_id` inválido. |
| 404 | `not_found` | Recurso no existe o fue eliminado. |
| 409 | `conflict` | Ya existe una cuenta bancaria con el mismo `name` en el tenant. |
| 500 | `internal_server_error` | Error inesperado del servidor. |

### Ejemplo de error

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "insufficient funds"
  },
  "meta": { "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5" }
}
```

---

## Notas técnicas

- Los movimientos confirmados **no se eliminan**. Si hay un error, usar `POST /transactions/{id}/reverse`.
- La reversión mantiene la trazabilidad: la transacción de extorno apunta al original mediante `reversed_transaction_id`.
- `reserved_amount` se recalcula automáticamente al crear, actualizar o eliminar un `Payable`, y al crear o revertir un `BankTransaction`.
- Las transferencias internas en esta fase solo están permitidas entre cuentas de la misma moneda.
- Para operaciones en moneda extranjera, enviar siempre `exchange_rate > 0`. En fase 1 no se realiza conversión automática de montos; el monto ingresado se registra tal cual.
- Los montos se almacenan con 2 decimales (`NUMERIC(15,2)`); `exchange_rate` usa `NUMERIC(15,6)`.

---

## Archivos relacionados

- `migrations/0009_treasury_schema.sql`
- `migrations/0010_treasury_rls_policy.sql`
- `internal/treasury/domain/entity.go`
- `internal/treasury/repository/repository.go`
- `internal/treasury/repository/postgres/treasury_postgres.go`
- `internal/treasury/usecase/usecases.go`
- `internal/treasury/transport/http_handlers.go`
- `cmd/arpify-api/main.go` (registro de rutas)
