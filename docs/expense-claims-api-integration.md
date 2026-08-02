# Expense Claims — Guía de Integración Técnica

## 1. Propósito y funcionalidad

El módulo **Expense Claims** (Rendición de Gastos) permite registrar, revisar y liquidar los gastos que los colaboradores de una empresa adelantan con su propio dinero o con fondos asignados.

### Funcionalidades principales

- Crear rendiciones en estado `DRAFT` con un número, empleado, título y monto adelantado.
- Agregar comprobantes de gasto (facturas, boletas, recibos, tickets) a una rendición en borrador.
- Enviar (`submit`), aprobar (`approve`), rechazar (`reject`) y liquidar (`settle`) rendiciones mediante transiciones de estado controladas.
- Liquidar rendiciones aprobadas generando automáticamente:
  - Un egreso bancario en Tesorería cuando el saldo favorece al empleado.
  - Un gasto de caja chica en Tesorería cuando el saldo favorece a la empresa.
- Listar y filtrar rendiciones por estado, texto libre y empleado.
- Registrar auditoría de cada operación en la tabla `logs`.

## 2. Modelo de datos

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `expense_claims.expense_claims` | Rendiciones de gastos. |
| `expense_claims.expense_claim_items` | Comprobantes / ítems de cada rendición. |

### Estados de una rendición

| Estado | Significado | Transiciones permitidas |
|--------|-------------|--------------------------|
| `DRAFT` | Borrador, editable. | `SUBMITTED`, `REJECTED` |
| `SUBMITTED` | Enviada para aprobación. | `APPROVED`, `REJECTED` |
| `APPROVED` | Aprobada, lista para liquidar. | `SETTLED`, `REJECTED` |
| `SETTLED` | Liquidada, impacto en tesorería. | Ninguna |
| `REJECTED` | Rechazada. | Ninguna |

### Tipos de documento de un ítem

- `INVOICE`
- `BOLETA`
- `RECEIPT`
- `TICKET`

### Categorías de gasto

- `TRAVEL`
- `MEALS`
- `SUPPLIES`
- `TRANSPORT`
- `OTHER`

### Cálculo del saldo

```
total_expenses = suma de los montos de los ítems
balance_amount = total_expenses - total_advanced
```

- `balance_amount > 0`: la empresa le debe al empleado.
- `balance_amount < 0`: el empleado debe devolver dinero a la caja chica.
- `balance_amount = 0`: cuadrado.

## 3. Relaciones con otros módulos

```
Expense Claims
├── Teams (valida que el employee_id exista)
├── Treasury (crea egresos bancarios y gastos de caja chica)
└── Audit (registra logs de creación, edición, cambio de estado y liquidación)
```

## 4. Base URL y autenticación

```
GET|POST|PUT|DELETE https://<host>/api/v1/expense-claims
```

Todas las rutas requieren:

- Header `Authorization: Bearer <access_token>` con rol `OWNER` o `ADMIN`.
- El tenant se infiere del token o del header `X-Tenant-ID` según la configuración del middleware.

## 5. Endpoints

### 5.1 Crear rendición

```http
POST /api/v1/expense-claims
```

**Request body**

```json
{
  "claim_number": "RG-2026-0001",
  "employee_id": "6f30a022-2f5f-442c-b9a7-d782a4c3e578",
  "title": "Viaje a Lima",
  "purpose": "Reuniones con cliente",
  "total_advanced": 500.00
}
```

**Campos**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `claim_number` | string(50) | Sí | Número único de rendición. |
| `employee_id` | uuid | Sí | Colaborador al que pertenece. |
| `title` | string(150) | Sí | Título descriptivo. |
| `purpose` | string | No | Motivo del gasto. |
| `total_advanced` | number | Sí | Monto entregado al colaborador. Debe ser `>= 0`. |

**Response 201 Created**

```json
{
  "success": true,
  "data": {
    "expense_claim": {
      "id": "...",
      "tenant_id": "...",
      "claim_number": "RG-2026-0001",
      "employee_id": "6f30a022-2f5f-442c-b9a7-d782a4c3e578",
      "title": "Viaje a Lima",
      "purpose": "Reuniones con cliente",
      "total_advanced": 500,
      "total_expenses": 0,
      "balance_amount": -500,
      "status": "DRAFT",
      "submission_date": null,
      "created_at": "2026-08-01T00:00:00Z",
      "updated_at": "2026-08-01T00:00:00Z",
      "deleted_at": null
    }
  },
  "meta": { "tenant_id": "..." }
}
```

### 5.2 Obtener rendición

```http
GET /api/v1/expense-claims/{id}
```

**Response 200 OK**

Misma forma que el objeto `expense_claim` del ejemplo anterior.

### 5.3 Listar rendiciones

```http
GET /api/v1/expense-claims?status=DRAFT&search=viaje&employee_id={uuid}&limit=20&offset=0
```

**Query params**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `status` | string | Filtra por estado. |
| `search` | string | Búsqueda libre sobre `claim_number`, `title` y `purpose`. |
| `employee_id` | uuid | Filtra por colaborador. |
| `limit` | int | Por defecto `20`. |
| `offset` | int | Por defecto `0`. |

**Response 200 OK**

```json
{
  "success": true,
  "data": {
    "items": [ /* array de expense_claim */ ],
    "total": 42
  },
  "meta": { "tenant_id": "..." }
}
```

### 5.4 Actualizar rendición

```http
PUT /api/v1/expense-claims/{id}
```

Solo se puede editar si el estado es `DRAFT`.

**Request body**

```json
{
  "title": "Viaje a Lima actualizado",
  "purpose": "Capacitación interna"
}
```

**Response 200 OK**

### 5.5 Eliminar rendición

```http
DELETE /api/v1/expense-claims/{id}
```

Solo se puede eliminar si el estado no es `SETTLED`.

**Response 200 OK**

```json
{
  "success": true,
  "data": {},
  "meta": { "tenant_id": "..." }
}
```

### 5.6 Enviar rendición

```http
POST /api/v1/expense-claims/{id}/submit
```

Cambia el estado de `DRAFT` a `SUBMITTED` y registra la fecha de envío.

**Response 200 OK**

### 5.7 Aprobar rendición

```http
POST /api/v1/expense-claims/{id}/approve
```

Cambia el estado de `SUBMITTED` a `APPROVED`.

**Response 200 OK**

### 5.8 Rechazar rendición

```http
POST /api/v1/expense-claims/{id}/reject
```

Puede rechazarse desde `DRAFT`, `SUBMITTED` o `APPROVED`.

**Response 200 OK**

### 5.9 Liquidar rendición

```http
POST /api/v1/expense-claims/{id}/settle
```

Solo rendiciones en estado `APPROVED`.

**Request body**

```json
{
  "bank_account_id": "56c05d4c-a391-4655-a9e6-85d576402ca2",
  "petty_cash_fund_id": "..."
}
```

**Reglas de liquidación**

| Saldo | Campo requerido | Impacto en Tesorería |
|-------|-----------------|----------------------|
| `balance_amount > 0` | `bank_account_id` | Egreso bancario por el saldo a favor del empleado. |
| `balance_amount < 0` | `petty_cash_fund_id` | Gasto de caja chica por el monto a devolver. |
| `balance_amount = 0` | Ninguno | Solo cambia a `SETTLED`. |

**Response 200 OK**

### 5.10 Crear ítem de gasto

```http
POST /api/v1/expense-claims/{id}/items
```

Solo sobre rendiciones `DRAFT`.

**Request body**

```json
{
  "document_type": "INVOICE",
  "document_number": "F001-12345",
  "supplier_name": "Transportes Lima",
  "supplier_tax_id": "20123456789",
  "expense_date": "2026-07-15",
  "amount": 120.00,
  "currency": "PEN",
  "category": "TRANSPORT"
}
```

**Campos**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `document_type` | string | Sí | `INVOICE`, `BOLETA`, `RECEIPT`, `TICKET`. |
| `document_number` | string(50) | Sí | Número del comprobante. |
| `supplier_name` | string(150) | Sí | Nombre del proveedor. |
| `supplier_tax_id` | string(20) | No | RUC/DNI del proveedor. |
| `expense_date` | string | Sí | Fecha en formato `YYYY-MM-DD`. |
| `amount` | number | Sí | Monto del gasto. `>= 0`. |
| `currency` | string(3) | Sí | Ej. `PEN`, `USD`. |
| `category` | string | Sí | `TRAVEL`, `MEALS`, `SUPPLIES`, `TRANSPORT`, `OTHER`. |

**Response 201 Created**

```json
{
  "success": true,
  "data": {
    "item": { /* expense_claim_item */ }
  },
  "meta": { "tenant_id": "..." }
}
```

### 5.11 Obtener ítem

```http
GET /api/v1/expense-claims/{id}/items/{item_id}
```

### 5.12 Listar ítems de una rendición

```http
GET /api/v1/expense-claims/{id}/items?limit=20&offset=0
```

### 5.13 Actualizar ítem

```http
PUT /api/v1/expense-claims/{id}/items/{item_id}
```

Solo sobre rendiciones `DRAFT`. Todos los campos son opcionales.

### 5.14 Eliminar ítem

```http
DELETE /api/v1/expense-claims/{id}/items/{item_id}
```

Solo sobre rendiciones `DRAFT`.

## 6. Flujo recomendado en el frontend

1. El colaborador crea la rendición en `DRAFT`.
2. Agrega los comprobantes como ítems.
3. Envía la rendición (`submit`).
4. Un aprobador aprueba (`approve`).
5. Un administrador liquida (`settle`) seleccionando la cuenta bancaria o caja chica según el saldo.

## 7. Códigos de error

| Código HTTP | `error.code` | Cuándo ocurre |
|-------------|--------------|---------------|
| 400 | `validation_error` | Campos inválidos, transición de estado no permitida, falta `bank_account_id`/`petty_cash_fund_id`. |
| 401 | `unauthorized` | Token inválido o ausente. |
| 403 | `forbidden` | Usuario sin rol `OWNER`/`ADMIN` o tenant inválido. |
| 404 | `not_found` | Rendición o ítem no existe. |
| 409 | `conflict` | Número de rendición duplicado. |
| 500 | `internal_server_error` | Error inesperado del servidor. |

## 8. Consideraciones de integración

- Las fechas de los ítems se envían como `YYYY-MM-DD`; el backend las convierte a `time.Time` en UTC.
- El `total_expenses` y `balance_amount` de la rendición se recalculan a partir de los ítems almacenados; no se envían desde el frontend.
- La liquidación puede fallar si la cuenta bancaria no tiene fondos suficientes (validación de Tesorería).
- Los endpoints de transición (`submit`, `approve`, `settle`, `reject`) no requieren body.
