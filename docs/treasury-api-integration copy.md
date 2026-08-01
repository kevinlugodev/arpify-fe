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
  - `OUTFLOW` — egreso/pago (puede vincularse a un `Payable`, anticipo de orden de servicio o reposición de caja chica).
  - `TRANSFER` — transferencia interna entre cuentas, incluyendo moneda cruzada mediante `exchange_rate`.
- Reversión de transacciones para mantener trazabilidad contable (no se borran movimientos confirmados).
- Órdenes de servicio (`ServiceOrder`) con control de anticipos y capacidad de vincular facturas/RHE.
- Caja chica (`PettyCashFund`) con reposición desde cuenta bancaria y registro de gastos sin movimiento bancario.
- Conciliación bancaria (`BankStatement` / `BankStatementItem`) con emparejamiento a transacciones internas.
- Proyección de flujo de caja (`CashFlowForecast`) a partir de saldos bancarios, payables pendientes y facturas de venta.

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
    ├── BankTransaction TRANSFER (origen/destino entre cuentas)
    │
    ├── BankTransaction OUTFLOW → PettyCashFund (reposición de caja chica)
    │
    └── BankTransaction OUTFLOW → ServiceOrderAdvance (anticipo de orden de servicio)

ServiceOrder
    ├── ServiceOrderAdvance (uno o más)
    └── Payable (factura/RHE vinculada; aplica anticipos disponibles)

BankStatement
    └── BankStatementItem (emparejable con BankTransaction)
```

| Entidad | Descripción |
|---------|-------------|
| `BankAccount` | Cuenta bancaria o caja del tenant. |
| `Payable` | Obligación de pago: RHE, factura de proveedor o liquidación tributaria. Puede vincularse a una orden de servicio. |
| `BankTransaction` | Movimiento de dinero real. Nunca se elimina; se revierte con otra transacción. |
| `ServiceOrder` | Compromiso de compra de servicios con control de anticipos. |
| `ServiceOrderAdvance` | Anticipo entregado a un proveedor vinculado a una orden de servicio. |
| `PettyCashFund` | Caja chica para gastos menores. |
| `BankStatement` | Estado de cuenta bancario importado. |
| `BankStatementItem` | Línea de estado de cuenta que puede emparejarse con una transacción interna. |

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
   Soporta moneda cruzada enviando `exchange_rate`; el sistema crea un par de transacciones vinculadas.

6. **Crear órdenes de servicio**  
   `POST /api/v1/treasury/service-orders`  
   Registrar el compromiso con el proveedor.

7. **Registrar anticipos de órdenes de servicio**  
   `POST /api/v1/treasury/service-orders/{id}/advances`  
   Crea un `BankTransaction` OUTFLOW categoría `SERVICE_ORDER_ADVANCE` y un `ServiceOrderAdvance`.

8. **Vincular facturas/RHE a órdenes de servicio**  
   `POST /api/v1/treasury/service-orders/{id}/link-payable`  
   Asocia un `Payable` y aplica automáticamente los anticipos disponibles.

9. **Administrar caja chica**  
   - Crear fondo: `POST /api/v1/treasury/petty-cash-funds`  
   - Repositar: `POST /api/v1/treasury/petty-cash-funds/{id}/replenish` (OUTFLOW bancario).  
   - Registrar gasto: `POST /api/v1/treasury/petty-cash-funds/{id}/expenses` (solo decrementa saldo del fondo).

10. **Conciliar estados de cuenta**  
    - Importar: `POST /api/v1/treasury/bank-statements`  
    - Listar ítems: `GET /api/v1/treasury/bank-statements/{id}/items`  
    - Emparejar: `POST /api/v1/treasury/bank-statement-items/{id}/match`

11. **Proyectar flujo de caja**  
    `GET /api/v1/treasury/cash-flow-forecast?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&interval_days=N`

12. **Revertir errores**  
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
- `SERVICE_ORDER_ADVANCE`
- `PETTY_CASH_FUNDING`
- `PETTY_CASH_EXPENSE`
- `OTHER`

> **Nota:** `SERVICE_ORDER_ADVANCE`, `PETTY_CASH_FUNDING` y `PETTY_CASH_EXPENSE` deben crearse únicamente a través de sus endpoints dedicados.

### `PaymentStatus` (Payable)

- `PENDING` — Pendiente.
- `PARTIALLY_PAID` — Pago parcial.
- `PAID` — Pagado.
- `CANCELLED` — Anulado.

### `ReconciliationStatus`

- `UNRECONCILED` — Sin conciliar.
- `MATCHED` — Conciliado.
- `DISCREPANCY` — Con discrepancia.

### `ServiceOrderStatus`

- `DRAFT` — Borrador.
- `APPROVED` — Aprobado.
- `IN_PROGRESS` — En progreso.
- `COMPLETED` — Completado.
- `CANCELLED` — Cancelado.

### `AdvanceApplicationStatus`

- `UNAPPLIED` — Sin aplicar.
- `PARTIALLY_APPLIED` — Parcialmente aplicado.
- `FULLY_APPLIED` — Totalmente aplicado.

### `PayableDocumentType`

- `RHE` — Recibo por honorarios.
- `INVOICE` — Factura de proveedor.
- `TAX_SETTLEMENT` — Liquidación tributaria.

---

## Endpoints

### Recurso: Banks (catálogo global)

Catálogo maestro de bancos, sin `tenant_id`. Sirve para alimentar el selector de bancos en el frontend.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/treasury/banks` | Listar bancos del catálogo. |
| `GET` | `/api/v1/treasury/banks/{id}` | Obtener banco. |

#### `GET /api/v1/treasury/banks`

- **Query params:**
  - `active_only` — default `true`. Enviar `false` para incluir inactivos.
  - `country_code` — filtrar por país, ej. `PE`.
  - `limit`, `offset` — paginación.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "Banco de Crédito del Perú",
        "short_name": "BCP",
        "code": "bcp",
        "country_code": "PE",
        "swift_code": "BCPLPEPL",
        "sbs_code": "002",
        "website_url": "https://www.viabcp.com",
        "logo_url": null,
        "icon": null,
        "sort_order": 1,
        "is_active": true,
        "created_at": "2026-07-31T00:00:00Z",
        "updated_at": "2026-07-31T00:00:00Z"
      }
    ],
    "total": 15
  },
  "meta": { "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5" }
}
```

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
        "bank_id": "11111111-1111-1111-1111-111111111111",
        "bank_name": "BCP",
        "name": "Cuenta Operativa USD",
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
  "bank_id": "11111111-1111-1111-1111-111111111111",
  "name": "Cuenta Operativa USD",
  "account_number": "123-4567890-0-12",
  "cci": "00212345678901234567",
  "currency": "USD",
  "real_balance": 1000.00,
  "is_active": true
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `bank_id` | uuid | Sí | ID del banco en el catálogo global `master.banks`. |
| `name` | string | Sí | Nombre propio de la cuenta. Máx. 150 caracteres. Único por tenant. |
| `account_number` | string | No | Máx. 50 caracteres. |
| `cci` | string | No | Máx. 50 caracteres. |
| `currency` | string | Sí | `PEN` o `USD`. |
| `real_balance` | float | No | Default `0`. Debe ser ≥ 0. |
| `is_active` | bool | No | Default `true`. |

**Response 201:** objeto `bank_account` completo incluyendo `bank_name` resuelto desde el catálogo. |

**Response 201:** objeto `bank_account` completo.

#### `PUT /api/v1/treasury/bank-accounts/{id}`

**Request body:** mismos campos opcionales.

**Response 200:** objeto `bank_account` actualizado.

#### `DELETE /api/v1/treasury/bank-accounts/{id}`

**Response 200:**

```json
{
  "success": true,
  "data": {},
  "meta": { "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5" }
}
```

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

**Response 200:**

```json
{
  "success": true,
  "data": {},
  "meta": { "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5" }
}
```

---

### Recurso: Bank Transactions

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/treasury/transactions` | Listar movimientos del tenant. |
| `POST` | `/api/v1/treasury/transactions` | Crear movimiento. |
| `GET` | `/api/v1/treasury/transactions/{id}` | Obtener movimiento. |
| `POST` | `/api/v1/treasury/transactions/{id}/reverse` | Revertir movimiento. |

#### `GET /api/v1/treasury/transactions`

- **Query params:** `limit`, `offset` — paginación.
- **Response 200:** `{ "items": [...], "total": N }` con todas las transacciones del tenant ordenadas por fecha descendente.

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
- `TRANSFER` no puede llevar `payable_id`.
- `TRANSFER` soporta moneda cruzada: el monto destino se calcula como `amount * exchange_rate`.
- Si se envía `payable_id`, el monto no puede superar el `remaining_amount` del payable.
- La moneda de la transacción debe coincidir con la moneda de la cuenta origen (a menos que se envíe `exchange_rate` para operaciones cruzadas).

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

### Recurso: Service Orders

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/treasury/service-orders` | Listar órdenes de servicio. |
| `POST` | `/api/v1/treasury/service-orders` | Crear orden de servicio. |
| `GET` | `/api/v1/treasury/service-orders/{id}` | Obtener orden de servicio. |
| `PUT` | `/api/v1/treasury/service-orders/{id}` | Actualizar orden de servicio. |
| `DELETE` | `/api/v1/treasury/service-orders/{id}` | Eliminación lógica. |
| `POST` | `/api/v1/treasury/service-orders/{id}/advances` | Registrar anticipo. |
| `POST` | `/api/v1/treasury/service-orders/{id}/link-payable` | Vincular payable y aplicar anticipos. |

#### `POST /api/v1/treasury/service-orders/{id}/advances`

**Request body:**

```json
{
  "bank_account_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "amount": 500.00,
  "currency": "PEN",
  "transaction_date": "2026-07-31",
  "operation_number": "ADV-2026-001",
  "notes": "Anticipo 30% orden de servicio"
}
```

Reglas:

- El anticipo no puede superar `total_amount - advance_amount_paid`.
- La orden pasa a `IN_PROGRESS` si estaba en `DRAFT` o `APPROVED`.
- Crea un `BankTransaction` OUTFLOW categoría `SERVICE_ORDER_ADVANCE`.

**Response 201:** `{ "advance": {...}, "bank_transaction": {...} }`.

#### `POST /api/v1/treasury/service-orders/{id}/link-payable`

**Request body:**

```json
{
  "payable_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
}
```

Reglas:

- Asocia `payables.service_order_id`.
- Aplica anticipos `UNAPPLIED` / `PARTIALLY_APPLIED` al `paid_amount` del payable hasta cubrir `net_amount`.
- Actualiza el estado del payable (`PENDING`, `PARTIALLY_PAID`, `PAID`).

**Response 200:** objeto `payable` actualizado.

---

### Recurso: Petty Cash Funds

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/treasury/petty-cash-funds` | Listar fondos de caja chica. |
| `POST` | `/api/v1/treasury/petty-cash-funds` | Crear fondo. |
| `GET` | `/api/v1/treasury/petty-cash-funds/{id}` | Obtener fondo. |
| `PUT` | `/api/v1/treasury/petty-cash-funds/{id}` | Actualizar fondo. |
| `DELETE` | `/api/v1/treasury/petty-cash-funds/{id}` | Eliminación lógica. |
| `POST` | `/api/v1/treasury/petty-cash-funds/{id}/replenish` | Repositar fondo desde cuenta bancaria. |
| `POST` | `/api/v1/treasury/petty-cash-funds/{id}/expenses` | Registrar gasto del fondo. |

#### `POST /api/v1/treasury/petty-cash-funds/{id}/replenish`

**Request body:**

```json
{
  "bank_account_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "amount": 200.00,
  "currency": "PEN",
  "exchange_rate": 1.0,
  "transaction_date": "2026-07-31",
  "operation_number": "REP-2026-001",
  "notes": "Reposición mensual caja chica"
}
```

Reglas:

- Crea un `BankTransaction` OUTFLOW categoría `PETTY_CASH_FUNDING`.
- Incrementa `petty_cash_funds.real_balance`.
- La moneda del fondo y de la cuenta deben coincidir.

**Response 201:** `{ "bank_transaction": {...}, "petty_cash_fund": {...} }`.

#### `POST /api/v1/treasury/petty-cash-funds/{id}/expenses`

**Request body:**

```json
{
  "amount": 25.00,
  "currency": "PEN",
  "transaction_date": "2026-07-31",
  "description": "Compra de útiles de oficina",
  "notes": "S/. 25.00"
}
```

Reglas:

- No crea movimiento bancario; solo decrementa el saldo del fondo.
- El fondo debe tener saldo suficiente.

**Response 200:** objeto `petty_cash_fund` actualizado.

---

### Recurso: Bank Statements

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/treasury/bank-statements` | Listar estados de cuenta. |
| `POST` | `/api/v1/treasury/bank-statements` | Importar estado de cuenta. |
| `GET` | `/api/v1/treasury/bank-statements/{id}` | Obtener estado de cuenta. |
| `DELETE` | `/api/v1/treasury/bank-statements/{id}` | Eliminación lógica (incluye ítems). |
| `GET` | `/api/v1/treasury/bank-statements/{id}/items` | Listar ítems del estado. |
| `POST` | `/api/v1/treasury/bank-statement-items/{id}/match` | Emparejar ítem con transacción interna. |

#### `POST /api/v1/treasury/bank-statements`

**Request body:**

```json
{
  "bank_account_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "file_name": "estado_cuenta_julio_2026.pdf",
  "period_start_date": "2026-07-01",
  "period_end_date": "2026-07-31",
  "items": [
    {
      "transaction_date": "2026-07-15",
      "operation_number": "OP-12345",
      "description": "Depósito cliente X",
      "amount": 1500.00,
      "type": "INFLOW"
    },
    {
      "transaction_date": "2026-07-20",
      "operation_number": "OP-12346",
      "description": "Transferencia proveedor Y",
      "amount": 800.00,
      "type": "OUTFLOW"
    }
  ]
}
```

**Response 201:** objeto `bank_statement`.

#### `POST /api/v1/treasury/bank-statement-items/{id}/match`

**Request body:**

```json
{
  "bank_transaction_id": "d4e5f6a7-b8c9-0123-def4-567890123456"
}
```

Reglas:

- Marca el ítem como `is_matched = true` y vincula `bank_transaction_id`.
- Actualiza `bank_transactions.reconciliation_status` a `MATCHED`.

**Response 200:** `data: {}`.

---

### Recurso: Cash Flow Forecast

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/treasury/cash-flow-forecast` | Proyección de flujo de caja. |

#### `GET /api/v1/treasury/cash-flow-forecast`

**Query params:**

- `start_date` — `YYYY-MM-DD` (requerido).
- `end_date` — `YYYY-MM-DD` (requerido).
- `interval_days` — default `7`.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "base_date": "2026-07-31T00:00:00Z",
    "items": [
      {
        "date": "2026-07-31T00:00:00Z",
        "projected_balance": 10500.00,
        "pending_inflows": 3000.00,
        "pending_outflows": 500.00
      }
    ],
    "total_bank_accounts": 8000.00
  },
  "meta": { "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5" }
}
```

El cálculo considera:

- `total_bank_accounts`: suma de `real_balance` de las cuentas bancarias del tenant.
- `pending_outflows`: `net_amount - paid_amount` de payables en `PENDING` / `PARTIALLY_PAID` con `due_date` en el bucket.
- `pending_inflows`: `total_amount` de `finance.invoices` con `flow = 'sale'` y fecha de pronóstico (`due_date` o `issue_date`) en el bucket.
- `projected_balance`: saldo acumulado `total_bank_accounts + inflows acumulados - outflows acumulados`.

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
- Las transferencias internas (`TRANSFER`) se implementan como un par de transacciones vinculadas por `transfer_peer_transaction_id` (OUTFLOW origen + INFLOW destino). Soportan moneda cruzada: el monto destino se calcula como `amount * exchange_rate`.
- Las categorías `SERVICE_ORDER_ADVANCE`, `PETTY_CASH_FUNDING` y `PETTY_CASH_EXPENSE` deben crearse exclusivamente mediante sus endpoints dedicados; `POST /transactions` las rechazará.
- Los gastos de caja chica no generan movimiento bancario; solo decrementan `petty_cash_funds.real_balance`.
- Los campos de dominio con punteros retornan `null` explícito en JSON (no se omite el campo).
- Todos los endpoints `DELETE` retornan `200 OK` con `data: {}`.
- Los listados vacíos retornan `200 OK` con `items: []`.
- Los montos se almacenan con 2 decimales (`NUMERIC(15,2)`); `exchange_rate` usa `NUMERIC(15,6)`.

---

## Archivos relacionados

- `migrations/0009_treasury_schema.sql`
- `migrations/0010_treasury_rls_policy.sql`
- `migrations/0013_treasury_extensions.sql`
- `migrations/0014_treasury_extensions_rls.sql`
- `migrations/0015_treasury_payable_service_order.sql`
- `migrations/0016_treasury_payable_service_order_rls.sql`
- `internal/treasury/domain/entity.go`
- `internal/treasury/repository/repository.go`
- `internal/treasury/repository/postgres/treasury_postgres.go`
- `internal/treasury/usecase/usecases.go`
- `internal/treasury/transport/http_handlers.go`
- `cmd/arpify-api/main.go` (registro de rutas)
