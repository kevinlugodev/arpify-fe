# Partner Equity, Advances & Profit Distribution — Guía de Integración Técnica

## 1. Propósito y funcionalidad

El módulo **Partner Equity** gestiona las cuentas de socios, la distribución de utilidades y los adelantos/retiros que realizan los socios de la empresa.

### Funcionalidades principales

- Crear cuentas de socio vinculadas a un colaborador (`team_member`) y un porcentaje de participación.
- Distribuir utilidades a todos los socios, reservando un porcentaje para impuestos y opex.
- Registrar retiros de adelanto (`ADVANCE_DRAW`) generando automáticamente un egreso bancario en Tesorería.
- Registrar pagos de liquidación (`SETTLEMENT_PAYMENT`) mediante RHE, sin impacto en Tesorería.
- Consultar el estado de cuenta (statement) de un socio.
- Registrar auditoría de cada operación en la tabla `logs`.

## 2. Modelo de datos

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `partner_equity.partner_accounts` | Cuentas de socio por tenant. |
| `partner_equity.profit_distributions` | Distribuciones de utilidades. |
| `partner_equity.partner_draw_transactions` | Movimientos de distribución, adelanto y liquidación. |

### Tipos de transacción de socio

| Tipo | Significado |
|------|-------------|
| `EARNED_DISTRIBUTION` | Utilidad ganada asignada desde una distribución. |
| `ADVANCE_DRAW` | Adelanto/retiro de utilidades disponibles. |
| `SETTLEMENT_PAYMENT` | Pago de liquidación documentado con RHE. |

### Cálculo de la distribución

```
reserved_tax_opex_amount = gross_pool_amount * reserve_percentage / 100
distributable_net_amount = gross_pool_amount - reserved_tax_opex_amount
```

Cada socio recibe:

```
partner_share = distributable_net_amount * equity_percentage / 100
```

## 3. Relaciones con otros módulos

```
Partner Equity
├── Teams (valida que el partner_employee_id exista)
├── Treasury (crea egreso bancario OUTFLOW de categoría PARTNER_DRAW)
└── Audit (registra logs de creación, edición, distribución, adelantos y liquidaciones)
```

## 4. Base URL y autenticación

```
GET|POST|PUT|DELETE https://<host>/api/v1/partner-equity/...
```

Todas las rutas requieren:

- Header `Authorization: Bearer <access_token>` con rol `OWNER` o `ADMIN`.
- El tenant se infiere del token o del header `X-Tenant-ID` según la configuración del middleware.

## 5. Endpoints

### 5.1 Crear cuenta de socio

```http
POST /api/v1/partner-equity/partner-accounts
```

**Request body**

```json
{
  "partner_employee_id": "6f30a022-2f5f-442c-b9a7-d782a4c3e578",
  "equity_percentage": 30.00
}
```

**Campos**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `partner_employee_id` | uuid | Sí | Colaborador que es socio. Debe existir en `teams.team_members`. |
| `equity_percentage` | number | Sí | Porcentaje de participación. Entre `0` y `100`. |

**Response 201 Created**

```json
{
  "success": true,
  "data": {
    "partner_account": {
      "id": "...",
      "tenant_id": "...",
      "partner_employee_id": "6f30a022-2f5f-442c-b9a7-d782a4c3e578",
      "equity_percentage": 30,
      "accumulated_earnings": 0,
      "total_draws_paid": 0,
      "current_available_balance": 0,
      "created_at": "2026-08-01T00:00:00Z",
      "updated_at": "2026-08-01T00:00:00Z",
      "deleted_at": null
    }
  },
  "meta": { "tenant_id": "..." }
}
```

### 5.2 Obtener cuenta de socio

```http
GET /api/v1/partner-equity/partner-accounts/{id}
```

**Response 200 OK**

Misma forma que el objeto `partner_account` del ejemplo anterior.

### 5.3 Listar cuentas de socios

```http
GET /api/v1/partner-equity/partner-accounts?limit=20&offset=0
```

**Query params**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `limit` | int | Por defecto `20`. |
| `offset` | int | Por defecto `0`. |

**Response 200 OK**

```json
{
  "success": true,
  "data": {
    "items": [ /* array de partner_account */ ],
    "total": 42
  },
  "meta": { "tenant_id": "..." }
}
```

### 5.4 Actualizar cuenta de socio

```http
PUT /api/v1/partner-equity/partner-accounts/{id}
```

**Request body**

```json
{
  "equity_percentage": 35.00
}
```

**Response 200 OK**

### 5.5 Eliminar cuenta de socio

```http
DELETE /api/v1/partner-equity/partner-accounts/{id}
```

**Response 200 OK**

```json
{
  "success": true,
  "data": {},
  "meta": { "tenant_id": "..." }
}
```

### 5.6 Obtener estado de cuenta de un socio

```http
GET /api/v1/partner-equity/partner-accounts/{id}/statement?limit=20&offset=0
```

**Response 200 OK**

```json
{
  "success": true,
  "data": {
    "partner_account": { /* partner_account */ },
    "transactions": [ /* partner_draw_transaction */ ],
    "total": 15
  },
  "meta": { "tenant_id": "..." }
}
```

### 5.7 Crear distribución de utilidades

```http
POST /api/v1/partner-equity/profit-distributions
```

**Request body**

```json
{
  "distribution_code": "DIST-2026-08",
  "gross_pool_amount": 100000.00,
  "reserve_percentage": 30.00,
  "distribution_date": "2026-08-01"
}
```

**Campos**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `distribution_code` | string(50) | Sí | Código único de la distribución. |
| `gross_pool_amount` | number | Sí | Monto bruto a distribuir. `>= 0`. |
| `reserve_percentage` | number | Sí | Porcentaje reservado. Entre `0` y `100`. |
| `distribution_date` | string | Sí | Fecha en formato `YYYY-MM-DD`. |

**Reglas de negocio**

- `reserved_tax_opex_amount = gross_pool_amount * reserve_percentage / 100`
- `distributable_net_amount = gross_pool_amount - reserved_tax_opex_amount`
- Cada socio recibe `distributable_net_amount * equity_percentage / 100`.
- Se crea automáticamente una transacción `EARNED_DISTRIBUTION` por socio.

**Response 201 Created**

```json
{
  "success": true,
  "data": {
    "profit_distribution": { /* profit_distribution */ }
  },
  "meta": { "tenant_id": "..." }
}
```

### 5.8 Obtener distribución de utilidades

```http
GET /api/v1/partner-equity/profit-distributions/{id}
```

**Response 200 OK**

### 5.9 Listar distribuciones de utilidades

```http
GET /api/v1/partner-equity/profit-distributions?limit=20&offset=0
```

**Response 200 OK**

### 5.10 Crear adelanto de socio

```http
POST /api/v1/partner-equity/partner-accounts/{id}/advance-draw
```

**Request body**

```json
{
  "bank_account_id": "56c05d4c-a391-4655-a9e6-85d576402ca2",
  "amount": 5000.00
}
```

**Campos**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `bank_account_id` | uuid | Sí | Cuenta bancaria de la que se retira el adelanto. |
| `amount` | number | Sí | Monto del adelanto. Debe ser `> 0` y no superar el saldo disponible. |

**Reglas de negocio**

- Se valida que `current_available_balance >= amount`.
- Se decrementa `current_available_balance` y se incrementa `total_draws_paid`.
- Se crea una transacción bancaria `OUTFLOW` con categoría `PARTNER_DRAW` en Tesorería.
- Se almacena el `bank_transaction_id` resultante en la transacción del socio.

**Response 201 Created**

```json
{
  "success": true,
  "data": {
    "draw_transaction": { /* partner_draw_transaction */ }
  },
  "meta": { "tenant_id": "..." }
}
```

### 5.11 Crear liquidación RHE de socio

```http
POST /api/v1/partner-equity/partner-accounts/{id}/settlement-payment
```

**Request body**

```json
{
  "rhe_document_number": "RHE-2026-0001",
  "amount": 3000.00,
  "notes": "Liquidación agosto 2026"
}
```

**Campos**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `rhe_document_number` | string(50) | Sí | Número del documento RHE. |
| `amount` | number | Sí | Monto de la liquidación. `> 0`. |
| `notes` | string | No | Notas adicionales. |

**Reglas de negocio**

- Solo registra el documento RHE; no genera impacto en Tesorería.

**Response 201 Created**

### 5.12 Obtener transacción de socio

```http
GET /api/v1/partner-equity/draw-transactions/{id}
```

**Response 200 OK**

### 5.13 Listar transacciones de socios

```http
GET /api/v1/partner-equity/draw-transactions?limit=20&offset=0
```

**Response 200 OK**

## 6. Flujo recomendado en el frontend

1. Crear las cuentas de socio con el porcentaje de participación.
2. Crear una distribución de utilidades ingresando el monto bruto y el porcentaje de reserva.
3. El sistema acredita automáticamente cada socio y crea las transacciones `EARNED_DISTRIBUTION`.
4. El socio puede solicitar un adelanto (`advance-draw`) si tiene saldo disponible.
5. Se registra la liquidación (`settlement-payment`) con el número de RHE correspondiente.

## 7. Códigos de error

| Código HTTP | `error.code` | Cuándo ocurre |
|-------------|--------------|---------------|
| 400 | `validation_error` | Campos inválidos, saldo insuficiente, falta `bank_account_id`/`rhe_document_number`. |
| 401 | `unauthorized` | Token inválido o ausente. |
| 403 | `forbidden` | Usuario sin rol `OWNER`/`ADMIN` o tenant inválido. |
| 404 | `not_found` | Cuenta, distribución o transacción no existe. |
| 409 | `conflict` | Código de distribución duplicado o cuenta de socio para el mismo empleado. |
| 500 | `internal_server_error` | Error inesperado del servidor. |

## 8. Consideraciones de integración

- Las fechas se envían como `YYYY-MM-DD`; el backend las convierte a `time.Time` en UTC.
- El saldo disponible (`current_available_balance`) se decrementa con cada adelanto y se incrementa con cada distribución.
- Los adelantos requieren fondos suficientes tanto en la cuenta de socio como en la cuenta bancaria (validación de Tesorería).
- Las liquidaciones (`SETTLEMENT_PAYMENT`) no impactan saldos; son registros documentales.
- Todas las operaciones de escritura se registran en auditoría.
