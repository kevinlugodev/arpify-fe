# Credit Control & Collections — Guía de Integración Técnica

## 1. Propósito y funcionalidad

El módulo **Credit Control & Collections** (Control de Crédito y Cobranza) permite hacer seguimiento de las cuentas por cobrar de un tenant, registrar pagos parciales/totales y coordinar acciones de cobranza sobre cada receivable.

### Funcionalidades principales

- Crear cronogramas de pago (`credit_account_schedules`) asociados a una factura de venta (`finance.invoices`).
- Registrar pagos y recalcular automáticamente `days_overdue`, `is_late_payment` y `collection_status`.
- Registrar bitácoras de contacto (`collection_logs`) con canales EMAIL, PHONE o WHATSAPP.
- Consultar un **aging report** que agrupa los saldos pendientes por rangos de vencimiento.
- Auditar cada operación de escritura en la tabla `logs`.

## 2. Modelo de datos

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `credit_control.credit_account_schedules` | Cronogramas de pago / cuentas por cobrar. |
| `credit_control.collection_logs` | Bitácoras de seguimiento de cobranza. |

### Estados de un schedule

| Estado | Significado |
|--------|-------------|
| `PENDING` | Pendiente de pago. |
| `PARTIALLY_PAID` | Pagado parcialmente, aún tiene saldo. |
| `PAID_ON_TIME` | Pagado en su totalidad a tiempo. |
| `PAID_LATE` | Pagado en su totalidad después de la fecha de vencimiento. |
| `DEFAULTED` | Vencido por más del umbral configurable (90 días para el MVP). |

### Canales de contacto

- `EMAIL`
- `PHONE`
- `WHATSAPP`

### Buckets del aging report

Los buckets se calculan en tiempo de ejecución a partir de `original_due_date` y la fecha actual.

- `CURRENT`
- `OVERDUE_1_30`
- `OVERDUE_31_60`
- `OVERDUE_61_90`
- `OVERDUE_90_PLUS`

### Cálculo del saldo pendiente

```
remaining_amount = invoice_amount - paid_amount
```

## 3. Relaciones con otros módulos

```
Credit Control & Collections
├── Finance (valida que el receivable_id / invoice exista)
└── Audit (registra logs de creación, edición, pago y eliminación)
```

## 4. Base URL y autenticación

```
GET|POST|PUT|DELETE https://<host>/api/v1/credit-control
```

Todas las rutas requieren:

- Header `Authorization: Bearer <access_token>` con rol `OWNER` o `ADMIN`.
- El tenant se infiere del token o del header `X-Tenant-ID` según la configuración del middleware.

## 5. Endpoints

### 5.1 Crear schedule

```http
POST /api/v1/credit-control/schedules
```

**Request body**

```json
{
  "receivable_id": "6f30a022-2f5f-442c-b9a7-d782a4c3e578",
  "customer_id": "b2c4e6f8-1234-5678-90ab-cdef12345678",
  "original_due_date": "2026-08-31",
  "invoice_amount": 1500.00
}
```

**Campos**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `receivable_id` | uuid | Sí | Factura de venta (`finance.invoices`) a la que se asocia. |
| `customer_id` | uuid | No | Cliente asociado. |
| `original_due_date` | string | Sí | Fecha de vencimiento en formato `YYYY-MM-DD`. |
| `invoice_amount` | number | Sí | Monto total a cobrar. Debe ser `>= 0`. Si se envía `0`, el backend toma el `total_amount` de la factura. |

**Response 201 Created**

```json
{
  "success": true,
  "data": {
    "schedule": {
      "id": "...",
      "tenant_id": "...",
      "receivable_id": "6f30a022-2f5f-442c-b9a7-d782a4c3e578",
      "customer_id": "b2c4e6f8-1234-5678-90ab-cdef12345678",
      "original_due_date": "2026-08-31T00:00:00Z",
      "actual_payment_date": null,
      "invoice_amount": 1500,
      "paid_amount": 0,
      "days_overdue": 0,
      "is_late_payment": false,
      "collection_status": "PENDING",
      "created_at": "2026-08-01T00:00:00Z",
      "updated_at": "2026-08-01T00:00:00Z",
      "deleted_at": null
    }
  },
  "meta": { "tenant_id": "..." }
}
```

### 5.2 Obtener schedule

```http
GET /api/v1/credit-control/schedules/{id}
```

**Response 200 OK**

Misma forma que el objeto `schedule` del ejemplo anterior.

### 5.3 Listar schedules

```http
GET /api/v1/credit-control/schedules?status=PENDING&customer_id={uuid}&limit=20&offset=0
```

**Query params**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `status` | string | Filtra por estado. |
| `customer_id` | uuid | Filtra por cliente. |
| `limit` | int | Por defecto `20`. |
| `offset` | int | Por defecto `0`. |

**Response 200 OK**

```json
{
  "success": true,
  "data": {
    "items": [ /* array de schedules */ ],
    "total": 42
  },
  "meta": { "tenant_id": "..." }
}
```

### 5.4 Actualizar schedule

```http
PUT /api/v1/credit-control/schedules/{id}
```

Permite editar `customer_id`, `original_due_date` e `invoice_amount`. Los campos computados (`days_overdue`, `is_late_payment`, `collection_status`) se recalculan automáticamente.

**Request body**

```json
{
  "original_due_date": "2026-09-15",
  "invoice_amount": 1600.00
}
```

**Response 200 OK**

### 5.5 Eliminar schedule

```http
DELETE /api/v1/credit-control/schedules/{id}
```

Elimina de forma lógica el schedule y sus collection logs asociados.

**Response 200 OK**

```json
{
  "success": true,
  "data": {},
  "meta": { "tenant_id": "..." }
}
```

### 5.6 Registrar pago

```http
POST /api/v1/credit-control/schedules/{id}/record-payment
```

Acumula el monto enviado al `paid_amount` existente y recalcula el estado.

**Request body**

```json
{
  "actual_payment_date": "2026-08-30",
  "paid_amount": 1500.00
}
```

**Reglas de transición de estado**

| Condición | Estado resultante |
|-----------|-------------------|
| `paid_amount >= invoice_amount` y pago a tiempo | `PAID_ON_TIME` |
| `paid_amount >= invoice_amount` y pago después del vencimiento | `PAID_LATE` |
| `0 < paid_amount < invoice_amount` | `PARTIALLY_PAID` |
| Saldo pendiente y `days_overdue >= 90` | `DEFAULTED` |

**Response 200 OK**

### 5.7 Listar logs de un schedule

```http
GET /api/v1/credit-control/schedules/{id}/logs?limit=20&offset=0
```

**Response 200 OK**

```json
{
  "success": true,
  "data": {
    "items": [ /* array de collection_logs */ ],
    "total": 5
  },
  "meta": { "tenant_id": "..." }
}
```

### 5.8 Crear collection log

```http
POST /api/v1/credit-control/collection-logs
```

**Request body**

```json
{
  "credit_account_schedule_id": "...",
  "contact_date": "2026-08-01",
  "contact_channel": "PHONE",
  "notes": "Cliente promete pagar la próxima semana.",
  "next_follow_up_date": "2026-08-08"
}
```

**Campos**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `credit_account_schedule_id` | uuid | Sí | Schedule al que pertenece. |
| `contact_date` | string | Sí | Fecha de contacto en formato `YYYY-MM-DD`. |
| `contact_channel` | string | Sí | `EMAIL`, `PHONE` o `WHATSAPP`. |
| `notes` | string | Sí | Notas de la conversación. |
| `next_follow_up_date` | string | No | Próxima fecha de seguimiento. |

**Response 201 Created**

### 5.9 Obtener collection log

```http
GET /api/v1/credit-control/collection-logs/{id}
```

**Response 200 OK**

### 5.10 Listar collection logs

```http
GET /api/v1/credit-control/collection-logs?schedule_id={uuid}&limit=20&offset=0
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `schedule_id` | uuid | Filtra por schedule. |
| `limit` | int | Por defecto `20`. |
| `offset` | int | Por defecto `0`. |

### 5.11 Actualizar collection log

```http
PUT /api/v1/credit-control/collection-logs/{id}
```

Todos los campos son opcionales.

**Request body**

```json
{
  "notes": "Cliente reprogramó pago para el 15.",
  "next_follow_up_date": "2026-08-15"
}
```

### 5.12 Eliminar collection log

```http
DELETE /api/v1/credit-control/collection-logs/{id}
```

### 5.13 Aging report

```http
GET /api/v1/credit-control/aging-report
```

Agrupa los schedules abiertos (`PENDING`, `PARTIALLY_PAID`, `DEFAULTED` con saldo pendiente) en buckets de vencimiento.

**Response 200 OK**

```json
{
  "success": true,
  "data": {
    "buckets": {
      "CURRENT": { "total": 5000.00, "count": 2 },
      "OVERDUE_1_30": { "total": 2500.00, "count": 1 },
      "OVERDUE_31_60": { "total": 0, "count": 0 },
      "OVERDUE_61_90": { "total": 0, "count": 0 },
      "OVERDUE_90_PLUS": { "total": 1500.00, "count": 1 }
    },
    "total_outstanding": 9000.00,
    "total_count": 4
  },
  "meta": { "tenant_id": "..." }
}
```

## 6. Flujo recomendado en el frontend

1. Crear un schedule cuando se emite una factura de venta con vencimiento futuro.
2. Registrar pagos a medida que el cliente liquida la deuda (`record-payment`).
3. Si el cliente no paga, crear collection logs periódicamente.
4. Consultar el aging report para priorizar cobranzas.

## 7. Códigos de error

| Código HTTP | `error.code` | Cuándo ocurre |
|-------------|--------------|---------------|
| 400 | `validation_error` | Campos inválidos, estado/channel desconocido, monto de pago `<= 0`. |
| 401 | `unauthorized` | Token inválido o ausente. |
| 403 | `forbidden` | Usuario sin rol `OWNER`/`ADMIN` o tenant inválido. |
| 404 | `not_found` | Schedule, log o factura no existe. |
| 500 | `internal_server_error` | Error inesperado del servidor. |

## 8. Consideraciones de integración

- Las fechas se envían como `YYYY-MM-DD`; el backend las convierte a `time.Time` en UTC.
- `days_overdue`, `is_late_payment` y `collection_status` se recalculan automáticamente al registrar un pago o editar un schedule; no se envían desde el frontend.
- El monto enviado en `record-payment` se **suma** al `paid_amount` acumulado del schedule.
- El aging report calcula los buckets sobre `original_due_date`, no sobre `days_overdue` almacenado.
