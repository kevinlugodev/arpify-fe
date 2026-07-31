# Guía de Integración — Módulo Finanzas (Arpify)

Documento técnico para integrar el módulo de gestión tributaria peruana de Arpify. Cubre los endpoints REST, entidades, flujos de uso, estados de dominio y manejo de errores del namespace `/api/v1/finance`.

---

## 1. Introducción

### Propósito

El módulo **Finanzas** centraliza la gestión tributaria para empresas peruanas:

- Registro y liquidación de **IGV** (Impuesto General a las Ventas).
- Cálculo de pagos a cuenta de **renta de tercera categoría**.
- Gestión de **PLAME** (planillas y trabajadores).
- Registro de **recibos por honorarios** (4ta categoría) y **renta de segunda categoría**.
- Control de **detracciones** y **prorrata**.
- Generación/validación de archivos para **SUNAT** (SIRE, PLE, PLAME).

### Audiencia

- Frontend developers que consuman estas APIs.
- Otros agentes de integración (scripts, ERPs, conectores contables).

### Base URL

```text
/api/v1/finance
```

Todas las rutas se registran bajo este prefijo. Ver `internal/finance/transport/handler.go`.

### Autenticación y autorización

- **Autenticación:** token JWT válido + middleware de tenant (`X-Tenant-Id` o valor en contexto). Ver `cmd/arpify-api/main.go`.
- **Autorización:** solo los roles `owner` y `admin` pueden acceder a rutas bajo `/finance`. El middleware `RequireRole(UserRoleOwner, UserRoleAdmin)` protege todo el grupo.

### Formato de fechas

- En **requests** (body/query): `YYYY-MM-DD` (ej. `2026-01-15`). El backend usa el layout `2006-01-02`.
- En **responses**: fechas en formato ISO 8601 (`2026-01-15T00:00:00Z` o con zona horaria correspondiente).

### Paginación

Los endpoints de listado soportan:

- `?limit=` — cantidad de registros. Default: `20`.
- `?offset=` — desplazamiento. Default: `0`.

La respuesta incluye `items` (arreglo) y `total` (entero).

---

## 2. Entidades y relaciones

Cada entidad pertenece a un único `tenant`. A continuación, las relaciones principales:

```text
TaxProfile (1 por tenant)
    │
    ├── TaxPeriod (mensual, 1 por tenant/año/mes)
    │       ├── Invoice (ventas o compras; pertenece a un TaxPeriod)
    │       ├── TaxCalculation (resultado de liquidación, 1 por TaxPeriod)
    │       ├── PayrollPeriod (PLAME, referencia a TaxPeriod)
    │       │       └── PayrollEntry (trabajador dentro de un PayrollPeriod)
    │       ├── FeeReceipt (4ta categoría)
    │       ├── SecondCategoryIncome (2da categoría)
    │       ├── Detraction (detracción vinculada opcionalmente a Invoice)
    │       ├── IGVMonthlyHistory (resumen mensual de IGV)
    │       ├── IncomeTaxPaymentHistory (resumen mensual de pago de renta)
    │       ├── ProrrataCalculation (cálculo de prorrata del periodo)
    │       └── SUNATDeclarationFile (archivo PLE/SIRE/PLAME del periodo)
    │
    └── SUNATValidationResult (validaciones RUC/DNI/recibo almacenadas por tenant)
```

### Descripción de entidades

| Entidad | Descripción |
|---------|-------------|
| `TaxProfile` | Perfil tributario del contribuyente: RUC, razón social, régimen, representantes, etc. Máximo uno activo por tenant. |
| `TaxPeriod` | Periodo mensual (año/mes) para declarar. Estados: `draft`, `declared`, `paid`, `closed`. |
| `Invoice` | Comprobante de pago (venta o compra). Documentos SUNAT catalog 01: factura, boleta, notas de crédito/débito, guía, ticket, doc. no domiciliado. |
| `TaxCalculation` | Resultado de la liquidación del periodo: débito/crédito IGV, prorrata, pago a cuenta renta, total a pagar. |
| `PayrollPeriod` | Periodo de planilla mensual para PLAME. |
| `PayrollEntry` | Registro de un trabajador dentro de una planilla (ingresos, deducciones, aportes). |
| `FeeReceipt` | Recibo por honorarios (4ta categoría). Calcula retención IR automáticamente. |
| `SecondCategoryIncome` | Renta de segunda categoría (dividendos, intereses, regalías, otros). |
| `Detraction` | Detracción SUNAT asociada a una operación/invoice. |
| `IGVMonthlyHistory` | Histórico mensual de débito/crédito IGV y saldo a favor. |
| `IncomeTaxPaymentHistory` | Histórico mensual de pagos a cuenta de renta. |
| `ProrrataCalculation` | Cálculo de prorrata IGV para ventas gravadas/exoneradas. |
| `SUNATValidationResult` | Resultado de validación de RUC/DNI/recibo. |
| `SUNATDeclarationFile` | Archivo de declaración PLE/SIRE/PLAME generado. Estados: `pending`, `generated`, `submitted`. |

---

## 3. Flujo correcto de uso

1. **Crear/actualizar perfil tributario**  
   `PUT /api/v1/finance/tax-profile`  
   Registra RUC, razón social, régimen, dirección, representantes, etc.

2. **Crear periodo tributario**  
   `POST /api/v1/finance/tax-periods`  
   Ejemplo: año `2026`, mes `1`, estado inicial `draft`.

3. **Cargar facturas de ventas y compras**  
   `POST /api/v1/finance/invoices` (unitaria) o  
   `POST /api/v1/finance/invoices/bulk-import` (masiva).  
   Vincular cada factura al `tax_period_id` correspondiente.

4. **Calcular liquidación**  
   `POST /api/v1/finance/tax-calculations/{tax_period_id}/calculate`  
   El sistema agrupa ventas/compras, aplica prorrata, calcula IGV resultante y pago a cuenta de renta.  
   Se puede recalcular con `POST /tax-calculations/{tax_period_id}/recalculate`.

5. **Gestionar planillas, recibos, detracciones, históricos y prorrata**  
   Crear `PayrollPeriod` y sus `PayrollEntry`, registrar `FeeReceipt`, `SecondCategoryIncome`, `Detraction`, históricos y prorrata según corresponda.

6. **Generar/validar archivos SUNAT**  
   `POST /api/v1/finance/sunat/validate-ruc`  
   `POST /api/v1/finance/sunat/declaration-files/{id}/generate`  
   `POST /api/v1/finance/sunat/declaration-files/{id}/submit`

---

## 4. Referencia de endpoints

> **Notación:** los campos marcados como *(opcional)* pueden omitirse en el request. Los campos calculados se indican con el comentario `/* calculado */`. Toda respuesta exitosa usa el envelope del proyecto: `{ "success": true, "data": { ... }, "meta": { ... } }`. Los ejemplos muestran únicamente el contenido de `data`.

---

### Recurso: Perfil Tributario (`TaxProfile`)

Representa la información permanente del contribuyente. Solo existe un perfil activo por tenant; `PUT /finance/tax-profile` crea si no existe o actualiza si ya existe.

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/finance/tax-profile` | Obtener perfil tributario del tenant. |
| `PUT` | `/finance/tax-profile` | Crear o actualizar perfil tributario. |

#### `GET /finance/tax-profile`

- **Response 200:**

```json
{
  "tax_profile": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tenant_id": "660e9400-e29b-41d4-a716-446655440001",
    "legal_name": "EMPRESA DE EJEMPLO S.A.C.",
    "commercial_name": "EJEMPLO SAC",
    "ruc": "20100100100",
    "tax_regime": "general",
    "address": "Av. Ejemplo 123, Lima",
    "phone": "014567890",
    "mobile": "999888777",
    "main_activity_code": "6201",
    "main_activity_name": "Desarrollo de software",
    "is_good_taxpayer": true,
    "is_withholding_agent": false,
    "activity_start_date": "2015-03-15",
    "representatives": [
      {
        "name": "Juan Pérez",
        "document": "44556677",
        "position": "Gerente General"
      }
    ],
    "created_at": "2026-01-10T12:00:00Z",
    "updated_at": "2026-01-15T10:30:00Z"
  }
}
```

- **Errores comunes:** `404` si aún no existe perfil; `401`/`403` por auth/rol.

#### `PUT /finance/tax-profile`

- **Request body:**

```json
{
  "legal_name": "EMPRESA DE EJEMPLO S.A.C.",
  "commercial_name": "EJEMPLO SAC",
  "ruc": "20100100100",
  "tax_regime": "general",
  "address": "Av. Ejemplo 123, Lima",
  "phone": "014567890",
  "mobile": "999888777",
  "main_activity_code": "6201",
  "main_activity_name": "Desarrollo de software",
  "is_good_taxpayer": true,
  "is_withholding_agent": false,
  "activity_start_date": "2015-03-15",
  "representatives": [
    {
      "name": "Juan Pérez",
      "document": "44556677",
      "position": "Gerente General"
    }
  ]
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `legal_name` | string | Sí | Máx. 200 caracteres. |
| `commercial_name` | string | No | Máx. 200 caracteres. |
| `ruc` | string | Sí | Exactamente 11 dígitos. |
| `tax_regime` | string | Sí | `general`, `mype_tributario`, `rer`, `regimen_especial`. |
| `address` | string | No | Máx. 255 caracteres. |
| `phone` | string | No | Máx. 30 caracteres. |
| `mobile` | string | No | Máx. 30 caracteres. |
| `main_activity_code` | string | No | Máx. 20 caracteres. |
| `main_activity_name` | string | No | Máx. 255 caracteres. |
| `is_good_taxpayer` | bool | No | Default `false`. |
| `is_withholding_agent` | bool | No | Default `false`. |
| `activity_start_date` | string | No | Formato `YYYY-MM-DD`. |
| `representatives` | array | No | Cada elemento tiene `name`, `document`, `position`. |

- **Response 200:** objeto `tax_profile` completo (ver ejemplo anterior).
- **Errores comunes:** `400` (RUC inválido, régimen inválido, `legal_name` vacío); `401`/`403`; `500`.

---

### Recurso: Periodos Tributarios (`TaxPeriod`)

Periodo mensual para declaración tributaria.

**Estados posibles:**

- `draft` — borrador, editable.
- `declared` — declarado.
- `paid` — pagado.
- `closed` — cerrado (no editable).

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/finance/tax-periods` | Listar periodos. |
| `POST` | `/finance/tax-periods` | Crear periodo. |
| `GET` | `/finance/tax-periods/{id}` | Obtener periodo por ID. |
| `PUT` | `/finance/tax-periods/{id}` | Actualizar periodo. |
| `DELETE` | `/finance/tax-periods/{id}` | Eliminación lógica. |
| `POST` | `/finance/tax-periods/{id}/close` | Cerrar periodo. |

#### `GET /finance/tax-periods`

- **Query params:** `?year=2026`, `?limit=20`, `?offset=0`.
- **Response 200:**

```json
{
  "items": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "tenant_id": "660e9400-e29b-41d4-a716-446655440001",
      "year": 2026,
      "month": 1,
      "status": "draft",
      "due_date": "2026-02-17",
      "declared_at": null,
      "paid_at": null,
      "created_at": "2026-01-05T09:00:00Z",
      "updated_at": "2026-01-05T09:00:00Z"
    }
  ],
  "total": 1
}
```

#### `POST /finance/tax-periods`

- **Request body:**

```json
{
  "year": 2026,
  "month": 1,
  "status": "draft",
  "due_date": "2026-02-17"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `year` | int | Sí | Rango 2000–2100. |
| `month` | int | Sí | 1–12. |
| `status` | string | Sí | `draft`, `declared`, `paid`, `closed`. |
| `due_date` | string | No | Formato `YYYY-MM-DD`. |

- **Response 201:** objeto `tax_period` completo.
- **Errores comunes:** `400` (año/mes inválido); `409` (periodo duplicado para tenant/año/mes); `401`/`403`.

#### `PUT /finance/tax-periods/{id}`

- **Request body:**

```json
{
  "status": "declared",
  "due_date": "2026-02-20"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `status` | string | No | Uno de los estados válidos. |
| `due_date` | string | No | `YYYY-MM-DD`; enviar `null` para quitar. |

- **Response 200:** objeto `tax_period` actualizado.
- **Errores comunes:** `400`; `404` periodo no existe; `409`.

#### `DELETE /finance/tax-periods/{id}`

- **Response 204:** sin body.
- **Errores comunes:** `404`; `500`.

#### `POST /finance/tax-periods/{id}/close`

- **Response 200:** `{ }` (objeto vacío dentro de `data`).
- **Errores comunes:** `404`; `500`.

---

### Recurso: Facturas (`Invoice`)

Comprobantes de pago de ventas (`sale`) o compras (`purchase`). Cada factura pertenece a un `TaxPeriod`.

**Flows:** `sale`, `purchase`.

**Tipos de documento (`document_type`):**

- `01` — Factura
- `03` — Boleta
- `07` — Nota de Crédito
- `08` — Nota de Débito
- `09` — Guía de Remisión
- `12` — Ticket
- `40` — Documento No Domiciliado

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/finance/invoices` | Listar facturas. |
| `POST` | `/finance/invoices` | Crear factura. |
| `POST` | `/finance/invoices/bulk-import` | Importar facturas en bloque. |
| `GET` | `/finance/invoices/{id}` | Obtener factura. |
| `PUT` | `/finance/invoices/{id}` | Actualizar factura. |
| `DELETE` | `/finance/invoices/{id}` | Eliminación lógica. |

#### `GET /finance/invoices`

- **Query params:**
  - `?tax_period_id={uuid}`
  - `?flow=sale|purchase`
  - `?document_type=01|03|...`
  - `?serie=F001`
  - `?number=1234`
  - `?counterparty_ruc=20100100100`
  - `?limit=20&offset=0`
- **Response 200:** `{ "items": [...], "total": N }`.

#### `POST /finance/invoices`

- **Request body:**

```json
{
  "tax_period_id": "770e8400-e29b-41d4-a716-446655440002",
  "flow": "sale",
  "document_type": "01",
  "serie": "F001",
  "number": "00001234",
  "issue_date": "2026-01-10",
  "due_date": "2026-02-10",
  "customer_ruc": "20100100100",
  "customer_name": "CLIENTE SAC",
  "supplier_ruc": "",
  "supplier_name": "",
  "taxable_amount": 1000.00,
  "tax_amount": 180.00,
  "exempt_amount": 0,
  "inafect_amount": 0,
  "isc_amount": 0,
  "icbper_amount": 0,
  "other_taxes_amount": 0,
  "total_amount": 1180.00,
  "currency": "PEN",
  "exchange_rate": 1.0,
  "modified_document_id": null,
  "is_detraction": false,
  "detraction_amount": 0,
  "sunat_status": "ACCEPTED"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `tax_period_id` | uuid | Sí | UUID del periodo tributario. |
| `flow` | string | Sí | `sale` o `purchase`. |
| `document_type` | string | Sí | Uno de los códigos de documento. |
| `serie` | string | Sí | Máx. 20 caracteres. |
| `number` | string | Sí | Máx. 20 caracteres. |
| `issue_date` | string | Sí | `YYYY-MM-DD`. |
| `due_date` | string | No | `YYYY-MM-DD`. |
| `customer_ruc` | string | No | Máx. 11 caracteres. Relevante para ventas. |
| `customer_name` | string | No | Máx. 255 caracteres. Relevante para ventas. |
| `supplier_ruc` | string | No | Máx. 11 caracteres. Relevante para compras. |
| `supplier_name` | string | No | Máx. 255 caracteres. Relevante para compras. |
| `taxable_amount` | float | No | Default `0`. Debe ser ≥ 0. |
| `tax_amount` | float | No | Default `0`. Debe ser ≥ 0. |
| `exempt_amount` | float | No | Default `0`. Debe ser ≥ 0. |
| `inafect_amount` | float | No | Default `0`. Debe ser ≥ 0. |
| `isc_amount` | float | No | Default `0`. Debe ser ≥ 0. |
| `icbper_amount` | float | No | Default `0`. Debe ser ≥ 0. |
| `other_taxes_amount` | float | No | Default `0`. Debe ser ≥ 0. |
| `total_amount` | float | Sí | Debe ser ≥ 0. |
| `currency` | string | Sí | Código ISO de 3 caracteres, ej. `PEN`, `USD`. |
| `exchange_rate` | float | Sí | Debe ser > 0. Para `PEN` usar `1.0`. |
| `modified_document_id` | uuid | No | ID del documento modificado (notas crédito/débito). |
| `is_detraction` | bool | No | Default `false`. |
| `detraction_amount` | float | No | Default `0`. Debe ser ≥ 0. |
| `sunat_status` | string | No | Máx. 50 caracteres. Ej. `ACCEPTED`, `REJECTED`. |

- **Response 201:** objeto `invoice` completo con `id`, `tenant_id`, `created_at`, `updated_at`.
- **Errores comunes:** `400` (`tax_period_id` inválido, fecha inválida, `exchange_rate` ≤ 0, moneda no de 3 caracteres); `404` periodo no existe (si el repositorio valida FK); `409` duplicado.

#### `POST /finance/invoices/bulk-import`

- **Request body:**

```json
{
  "tax_period_id": "770e8400-e29b-41d4-a716-446655440002",
  "flow": "sale",
  "invoices": [
    {
      "tax_period_id": "770e8400-e29b-41d4-a716-446655440002",
      "flow": "sale",
      "document_type": "01",
      "serie": "F001",
      "number": "00001234",
      "issue_date": "2026-01-10",
      "customer_ruc": "20100100100",
      "customer_name": "CLIENTE SAC",
      "taxable_amount": 1000.00,
      "tax_amount": 180.00,
      "total_amount": 1180.00,
      "currency": "PEN",
      "exchange_rate": 1.0
    }
  ]
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `tax_period_id` | uuid | Sí | Aplicado a todas las facturas del lote. |
| `flow` | string | Sí | Aplicado a todas las facturas del lote. |
| `invoices` | array | Sí | Arreglo de objetos con los mismos campos que `POST /invoices`. |

- **Response 201:**

```json
{
  "imported": 1
}
```

- **Errores comunes:** `400` (lote vacío, factura inválida); `401`/`403`; `500`.

#### `PUT /finance/invoices/{id}`

- **Request body:** mismo esquema que `POST /finance/invoices`, pero todos los campos son opcionales. Solo se actualizan los enviados.
- **Response 200:** objeto `invoice` actualizado.

#### `GET /finance/invoices/{id}` y `DELETE /finance/invoices/{id}`

- `GET` devuelve `200` con el objeto completo.
- `DELETE` devuelve `204`.

---

### Recurso: Liquidación de Impuestos (`TaxCalculation`)

Resultado del cálculo de impuestos para un periodo. Se genera a partir de las facturas cargadas.

**Campos calculados automáticamente:**

- `igv_tax_debit` — IGV sobre ventas gravadas (18% por defecto).
- `igv_tax_credit` — crédito fiscal luego de aplicar prorrata.
- `igv_result` — resultado IGV (a pagar o saldo cero).
- `igv_credit_balance` — saldo a favor si crédito > débito.
- `income_tax_payment` — pago a cuenta de renta (coeficiente 1.5% por defecto).
- `total_to_pay` — suma de IGV resultante + renta.
- `concepts` — líneas de detalle tipo PDT 621.

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/finance/tax-calculations/{tax_period_id}` | Obtener liquidación del periodo. |
| `POST` | `/finance/tax-calculations/{tax_period_id}/calculate` | Calcular/crear liquidación. |
| `POST` | `/finance/tax-calculations/{tax_period_id}/recalculate` | Recalcular liquidación. |

#### `GET /finance/tax-calculations/{tax_period_id}`

- **Response 200:**

```json
{
  "tax_calculation": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "tenant_id": "660e9400-e29b-41d4-a716-446655440001",
    "tax_period_id": "770e8400-e29b-41d4-a716-446655440002",
    "igv_net_sales": 10000.00,
    "igv_tax_debit": 1800.00,
    "igv_tax_credit": 900.00,
    "igv_result": 900.00,
    "igv_credit_balance": 0,
    "income_tax_coefficient": 0.015,
    "income_tax_net_income": 10000.00,
    "income_tax_payment": 150.00,
    "itan_quota": 0,
    "total_to_pay": 1050.00,
    "concepts": [
      {
        "id": "990e8400-e29b-41d4-a716-446655440004",
        "tax_calculation_id": "880e8400-e29b-41d4-a716-446655440003",
        "code": "100",
        "name": "Ventas netas gravadas",
        "base_amount": 10000.00,
        "tax_amount": 1800.00,
        "payment_amount": 0,
        "order_index": 1
      }
    ],
    "created_at": "2026-01-20T10:00:00Z",
    "updated_at": "2026-01-20T10:00:00Z"
  }
}
```

- **Errores comunes:** `404` si no existe liquidación; `401`/`403`.

#### `POST /finance/tax-calculations/{tax_period_id}/calculate`

- **Request body:** ninguno.
- **Response 200:** objeto `tax_calculation` calculado.
- **Errores comunes:** `404` periodo no existe; `400` validación fallida; `500`.

#### `POST /finance/tax-calculations/{tax_period_id}/recalculate`

- Mismo comportamiento que `/calculate`. Útil para forzar recálculo tras modificar facturas.

---

### Recurso: Planillas (`PayrollPeriod` y `PayrollEntry`)

Gestión mensual de planillas para PLAME.

**Estados de `PayrollPeriod`:** `draft`, `approved`, `paid`, `closed`.

**Sistemas de pensión (`PensionSystem`):** `ONP`, `AFP`, `MIXED`, `EXCLUDED`.

#### Endpoints de periodos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/finance/payroll-periods` | Listar periodos de planilla. |
| `POST` | `/finance/payroll-periods` | Crear periodo de planilla. |
| `GET` | `/finance/payroll-periods/{id}` | Obtener periodo. |
| `PUT` | `/finance/payroll-periods/{id}` | Actualizar periodo. |
| `DELETE` | `/finance/payroll-periods/{id}` | Eliminación lógica. |
| `POST` | `/finance/payroll-periods/{id}/close` | Cerrar periodo. |
| `GET` | `/finance/payroll-periods/{id}/entries` | Listar entries del periodo. |
| `POST` | `/finance/payroll-periods/{id}/entries` | Crear entry en el periodo. |

#### Endpoints de entries

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/finance/payroll-entries/{id}` | Obtener entry. |
| `PUT` | `/finance/payroll-entries/{id}` | Actualizar entry. |
| `DELETE` | `/finance/payroll-entries/{id}` | Eliminación lógica. |

#### `POST /finance/payroll-periods`

- **Request body:**

```json
{
  "tax_period_id": "770e8400-e29b-41d4-a716-446655440002",
  "year": 2026,
  "month": 1,
  "status": "draft"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `tax_period_id` | uuid | Sí | Periodo tributario asociado. |
| `year` | int | Sí | 2000–2100. |
| `month` | int | Sí | 1–12. |
| `status` | string | Sí | Estados válidos. |

- **Response 201:** objeto `payroll_period`.

#### `PUT /finance/payroll-periods/{id}`

- **Request body:**

```json
{
  "status": "approved",
  "paid_at": "2026-02-01"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `status` | string | No | Estados válidos. |
| `paid_at` | string | No | `YYYY-MM-DD`. |

- **Response 200:** objeto `payroll_period` actualizado.

#### `POST /finance/payroll-periods/{id}/entries`

- **Request body:**

```json
{
  "team_member_id": "aa0e8400-e29b-41d4-a716-446655440005",
  "document_type": "DNI",
  "document_number": "44556677",
  "full_name": "Ana García López",
  "pension_system": "AFP",
  "salary": 3500.00,
  "family_allowance": 0,
  "vacation_pay": 0,
  "overtime_pay": 200.00,
  "commissions": 0,
  "bonuses": 0,
  "pension_contribution": 150.00,
  "invalidity_insurance": 10.00,
  "afp_commission": 20.00,
  "fifth_category_tax": 0,
  "other_deductions": 0,
  "essalud_contribution": 315.00
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `team_member_id` | uuid | No | Opcional, vinculación a equipo. |
| `document_type` | string | Sí | Máx. 20 caracteres. |
| `document_number` | string | Sí | Máx. 50 caracteres. |
| `full_name` | string | Sí | Máx. 255 caracteres. |
| `pension_system` | string | Sí | `ONP`, `AFP`, `MIXED`, `EXCLUDED`. |
| `salary` | float | No | Default `0`. ≥ 0. |
| `family_allowance` | float | No | Default `0`. ≥ 0. |
| `vacation_pay` | float | No | Default `0`. ≥ 0. |
| `overtime_pay` | float | No | Default `0`. ≥ 0. |
| `commissions` | float | No | Default `0`. ≥ 0. |
| `bonuses` | float | No | Default `0`. ≥ 0. |
| `pension_contribution` | float | No | Default `0`. ≥ 0. |
| `invalidity_insurance` | float | No | Default `0`. ≥ 0. |
| `afp_commission` | float | No | Default `0`. ≥ 0. |
| `fifth_category_tax` | float | No | Default `0`. ≥ 0. |
| `other_deductions` | float | No | Default `0`. ≥ 0. |
| `essalud_contribution` | float | No | Default `0`. ≥ 0. |

- **Response 201:** objeto `payroll_entry` con campos calculados:
  - `total_income` — suma de ingresos.
  - `total_deductions` — suma de deducciones.
  - `net_pay` — `total_income - total_deductions`.

```json
{
  "payroll_entry": {
    "id": "bb0e8400-e29b-41d4-a716-446655440006",
    "tenant_id": "660e9400-e29b-41d4-a716-446655440001",
    "payroll_period_id": "cc0e8400-e29b-41d4-a716-446655440007",
    "team_member_id": "aa0e8400-e29b-41d4-a716-446655440005",
    "document_type": "DNI",
    "document_number": "44556677",
    "full_name": "Ana García López",
    "pension_system": "AFP",
    "salary": 3500.00,
    "family_allowance": 0,
    "vacation_pay": 0,
    "overtime_pay": 200.00,
    "commissions": 0,
    "bonuses": 0,
    "total_income": 3700.00,
    "pension_contribution": 150.00,
    "invalidity_insurance": 10.00,
    "afp_commission": 20.00,
    "fifth_category_tax": 0,
    "other_deductions": 0,
    "total_deductions": 180.00,
    "essalud_contribution": 315.00,
    "net_pay": 3520.00,
    "created_at": "2026-01-25T10:00:00Z",
    "updated_at": "2026-01-25T10:00:00Z"
  }
}
```

#### `PUT /finance/payroll-entries/{id}`

- **Request body:** mismos campos que `POST` pero opcionales. El sistema recalcula `total_income`, `total_deductions` y `net_pay`.
- **Response 200:** objeto `payroll_entry` actualizado.

#### `GET /finance/payroll-periods`, `GET /finance/payroll-periods/{id}`, `GET /finance/payroll-periods/{id}/entries`

- Listado soporta `?year=`, `?limit=`, `?offset=`.
- `GET /entries` retorna `{ "items": [...], "total": N }`.

---

### Recurso: Recibos por Honorarios (`FeeReceipt`)

Ingresos de cuarta categoría. La retención de IR se calcula automáticamente.

**Estados:** `draft`, `declared`, `paid`, `canceled`.

**Campos calculados:**

- `ir_withholding_amount` — `gross_amount * ir_withholding_rate`.
- `net_amount` — `gross_amount - ir_withholding_amount`.
- Si `ir_withholding_rate` es `0`, se aplica la tasa por defecto `0.08` (8%).

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/finance/fee-receipts` | Listar recibos. |
| `POST` | `/finance/fee-receipts` | Crear recibo. |
| `GET` | `/finance/fee-receipts/{id}` | Obtener recibo. |
| `PUT` | `/finance/fee-receipts/{id}` | Actualizar recibo. |
| `DELETE` | `/finance/fee-receipts/{id}` | Eliminación lógica. |

#### `GET /finance/fee-receipts`

- **Query params:** `?tax_period_id=`, `?status=`, `?payer_ruc=`, `?recipient_document_number=`, `?limit=`, `?offset=`.
- **Response 200:** `{ "items": [...], "total": N }`.

#### `POST /finance/fee-receipts`

- **Request body:**

```json
{
  "tax_period_id": "770e8400-e29b-41d4-a716-446655440002",
  "issue_date": "2026-01-12",
  "serie": "E001",
  "number": "00000045",
  "payer_ruc": "20100100100",
  "payer_name": "CLIENTE SAC",
  "recipient_document_type": "DNI",
  "recipient_document_number": "44556677",
  "recipient_name": "Carlos Ruiz",
  "gross_amount": 2500.00,
  "ir_withholding_rate": 0.08,
  "status": "draft",
  "sunat_status": "PENDING"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `tax_period_id` | uuid | Sí | Periodo tributario. |
| `issue_date` | string | Sí | `YYYY-MM-DD`. |
| `serie` | string | Sí | Máx. 20 caracteres. |
| `number` | string | Sí | Máx. 20 caracteres. |
| `payer_ruc` | string | Sí | Exactamente 11 dígitos. |
| `payer_name` | string | Sí | Máx. 255 caracteres. |
| `recipient_document_type` | string | Sí | Máx. 20 caracteres. |
| `recipient_document_number` | string | Sí | Máx. 50 caracteres. |
| `recipient_name` | string | Sí | Máx. 255 caracteres. |
| `gross_amount` | float | Sí | ≥ 0. |
| `ir_withholding_rate` | float | No | 0–1. Default `0.08`. |
| `status` | string | Sí | Estados válidos. |
| `sunat_status` | string | No | Máx. 50 caracteres. |

- **Response 201:** objeto `fee_receipt` con `ir_withholding_amount` y `net_amount` calculados.

```json
{
  "fee_receipt": {
    "id": "dd0e8400-e29b-41d4-a716-446655440008",
    "tenant_id": "660e9400-e29b-41d4-a716-446655440001",
    "tax_period_id": "770e8400-e29b-41d4-a716-446655440002",
    "issue_date": "2026-01-12T00:00:00Z",
    "serie": "E001",
    "number": "00000045",
    "payer_ruc": "20100100100",
    "payer_name": "CLIENTE SAC",
    "recipient_document_type": "DNI",
    "recipient_document_number": "44556677",
    "recipient_name": "Carlos Ruiz",
    "gross_amount": 2500.00,
    "ir_withholding_rate": 0.08,
    "ir_withholding_amount": 200.00,
    "net_amount": 2300.00,
    "status": "draft",
    "sunat_status": "PENDING",
    "created_at": "2026-01-25T10:00:00Z",
    "updated_at": "2026-01-25T10:00:00Z"
  }
}
```

#### `PUT /finance/fee-receipts/{id}`

- **Request body:** mismos campos opcionales. Si se actualiza `gross_amount` o `ir_withholding_rate`, el sistema vuelve a calcular retención y neto.
- **Response 200:** objeto `fee_receipt` actualizado.

---

### Recurso: Renta de Segunda Categoría (`SecondCategoryIncome`)

Registro de ingresos de segunda categoría (dividendos, intereses, regalías, otros).

**Tipos (`income_type`):** `dividends`, `interest`, `royalties`, `others`.

**Estados:** `draft`, `declared`, `paid`.

**Campos calculados:**

- `withholding_amount` — `gross_amount * withholding_rate`.
- `net_amount` — `gross_amount - withholding_amount`.

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/finance/second-category-incomes` | Listar. |
| `POST` | `/finance/second-category-incomes` | Crear. |
| `GET` | `/finance/second-category-incomes/{id}` | Obtener. |
| `PUT` | `/finance/second-category-incomes/{id}` | Actualizar. |
| `DELETE` | `/finance/second-category-incomes/{id}` | Eliminar. |

#### `GET /finance/second-category-incomes`

- **Query params:** `?tax_period_id=`, `?income_type=`, `?status=`, `?payer_ruc=`, `?limit=`, `?offset=`.

#### `POST /finance/second-category-incomes`

- **Request body:**

```json
{
  "tax_period_id": "770e8400-e29b-41d4-a716-446655440002",
  "income_date": "2026-01-18",
  "income_type": "dividends",
  "payer_ruc": "20100100100",
  "payer_name": "EMPRESA PAGADORA SAC",
  "beneficiary_document_type": "DNI",
  "beneficiary_document_number": "44556677",
  "beneficiary_name": "María López",
  "gross_amount": 5000.00,
  "withholding_rate": 0.05,
  "status": "draft"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `tax_period_id` | uuid | Sí | Periodo tributario. |
| `income_date` | string | Sí | `YYYY-MM-DD`. |
| `income_type` | string | Sí | Tipos válidos. |
| `payer_ruc` | string | Sí | 11 dígitos. |
| `payer_name` | string | Sí | Máx. 255 caracteres. |
| `beneficiary_document_type` | string | Sí | Máx. 20 caracteres. |
| `beneficiary_document_number` | string | Sí | Máx. 50 caracteres. |
| `beneficiary_name` | string | Sí | Máx. 255 caracteres. |
| `gross_amount` | float | Sí | ≥ 0. |
| `withholding_rate` | float | Sí | 0–1. |
| `status` | string | Sí | Estados válidos. |

- **Response 201:** objeto `second_category_income` con `withholding_amount` y `net_amount` calculados.

#### `PUT /finance/second-category-incomes/{id}`

- **Request body:** campos opcionales; recalcula retención/neto si aplica.
- **Response 200:** objeto actualizado.

---

### Recurso: Detracciones (`Detraction`)

Detracciones SUNAT (CAT. 54) vinculadas a operaciones, opcionalmente a una `Invoice`.

**Estados:** `pending`, `deposited`, `applied`.

**Campo calculado:**

- `detraction_amount` — `taxable_amount * detraction_percentage / 100`.

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/finance/detractions` | Listar detracciones. |
| `POST` | `/finance/detractions` | Crear detracción. |
| `GET` | `/finance/detractions/{id}` | Obtener. |
| `PUT` | `/finance/detractions/{id}` | Actualizar. |
| `DELETE` | `/finance/detractions/{id}` | Eliminar. |

#### `GET /finance/detractions`

- **Query params:** `?tax_period_id=`, `?invoice_id=`, `?status=`, `?limit=`, `?offset=`.

#### `POST /finance/detractions`

- **Request body:**

```json
{
  "tax_period_id": "770e8400-e29b-41d4-a716-446655440002",
  "invoice_id": "ee0e8400-e29b-41d4-a716-446655440009",
  "operation_date": "2026-01-15",
  "detraction_code": "027",
  "detraction_percentage": 12.0,
  "taxable_amount": 10000.00,
  "deposit_date": "2026-01-16",
  "cip": "123456789012",
  "status": "deposited"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `tax_period_id` | uuid | Sí | Periodo tributario. |
| `invoice_id` | uuid | No | Factura relacionada. |
| `operation_date` | string | Sí | `YYYY-MM-DD`. |
| `detraction_code` | string | Sí | Máx. 20 caracteres. |
| `detraction_percentage` | float | Sí | 0–100. |
| `taxable_amount` | float | Sí | ≥ 0. |
| `deposit_date` | string | No | `YYYY-MM-DD`. |
| `cip` | string | No | Máx. 50 caracteres. |
| `status` | string | Sí | Estados válidos. |

- **Response 201:** objeto `detraction` con `detraction_amount` calculado.

#### `PUT /finance/detractions/{id}`

- Campos opcionales; recalcula `detraction_amount` si cambian `taxable_amount` o `detraction_percentage`.
- **Response 200:** objeto actualizado.

---

### Recurso: Histórico IGV Mensual (`IGVMonthlyHistory`)

Resumen mensual de IGV para un tenant. Útil para registrar saldos históricos o comparativos.

**Campos calculados:**

- `net_tax` — `tax_debit - tax_credit`.
- `credit_balance` — saldo a favor si `net_tax < 0`.

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/finance/igv-histories` | Listar. |
| `POST` | `/finance/igv-histories` | Crear. |
| `GET` | `/finance/igv-histories/{id}` | Obtener. |
| `PUT` | `/finance/igv-histories/{id}` | Actualizar. |
| `DELETE` | `/finance/igv-histories/{id}` | Eliminar. |

#### `GET /finance/igv-histories`

- **Query params:** `?year=`, `?limit=`, `?offset=`.

#### `POST /finance/igv-histories`

- **Request body:**

```json
{
  "year": 2025,
  "month": 12,
  "tax_debit": 5000.00,
  "tax_credit": 3000.00,
  "net_tax": 2000.00,
  "credit_balance": 0
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `year` | int | Sí | 2000–2100. |
| `month` | int | Sí | 1–12. |
| `tax_debit` | float | No | ≥ 0. |
| `tax_credit` | float | No | ≥ 0. |
| `net_tax` | float | No | Se recalcula si no coincide. |
| `credit_balance` | float | No | Se recalcula si no coincide. |

- **Response 201:** objeto `igv_monthly_history`.

#### `PUT /finance/igv-histories/{id}`

- Campos opcionales.
- **Response 200:** objeto actualizado.

---

### Recurso: Histórico de Pagos de Renta (`IncomeTaxPaymentHistory`)

Resumen mensual de pagos a cuenta de renta.

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/finance/income-tax-histories` | Listar. |
| `POST` | `/finance/income-tax-histories` | Crear. |
| `GET` | `/finance/income-tax-histories/{id}` | Obtener. |
| `PUT` | `/finance/income-tax-histories/{id}` | Actualizar. |
| `DELETE` | `/finance/income-tax-histories/{id}` | Eliminar. |

#### `GET /finance/income-tax-histories`

- **Query params:** `?year=`, `?limit=`, `?offset=`.

#### `POST /finance/income-tax-histories`

- **Request body:**

```json
{
  "year": 2025,
  "month": 12,
  "tax_regime": "general",
  "net_income": 50000.00,
  "coefficient": 0.015,
  "calculated_tax": 750.00,
  "previous_payments": 0,
  "payment_amount": 750.00
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `year` | int | Sí | 2000–2100. |
| `month` | int | Sí | 1–12. |
| `tax_regime` | string | Sí | Máx. 50 caracteres. |
| `net_income` | float | No | ≥ 0. |
| `coefficient` | float | No | 0–1. |
| `calculated_tax` | float | No | Monto calculado. |
| `previous_payments` | float | No | ≥ 0. |
| `payment_amount` | float | No | Monto a pagar. |

- **Response 201:** objeto `income_tax_payment_history`.

---

### Recurso: Cálculo de Prorrata (`ProrrataCalculation`)

Cálculo de prorrata IGV para periodos con ventas gravadas y exoneradas.

**Estados:** `draft`, `calculated`, `applied`.

**Campos calculados:**

- `total_sales` — `taxable_sales + exempt_sales`.
- `total_purchases` — `taxable_purchases + exempt_purchases`.
- `prorrata_percentage` — `(taxable_sales / total_sales) * 100`.
- `deductible_tax_credit` — crédito fiscal deducible.
- `non_deductible_tax_credit` — crédito fiscal no deducible.

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/finance/prorrata-calculations` | Listar. |
| `POST` | `/finance/prorrata-calculations` | Crear. |
| `GET` | `/finance/prorrata-calculations/{id}` | Obtener. |
| `PUT` | `/finance/prorrata-calculations/{id}` | Actualizar. |
| `DELETE` | `/finance/prorrata-calculations/{id}` | Eliminar. |

#### `GET /finance/prorrata-calculations`

- **Query params:** `?tax_period_id=`, `?status=`, `?limit=`, `?offset=`.

#### `POST /finance/prorrata-calculations`

- **Request body:**

```json
{
  "tax_period_id": "770e8400-e29b-41d4-a716-446655440002",
  "taxable_sales": 8000.00,
  "exempt_sales": 2000.00,
  "taxable_purchases": 5000.00,
  "exempt_purchases": 1000.00,
  "status": "calculated"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `tax_period_id` | uuid | Sí | Periodo tributario. |
| `taxable_sales` | float | No | ≥ 0. |
| `exempt_sales` | float | No | ≥ 0. |
| `taxable_purchases` | float | No | ≥ 0. |
| `exempt_purchases` | float | No | ≥ 0. |
| `status` | string | Sí | Estados válidos. |

- **Response 201:** objeto `prorrata_calculation` con totales, porcentaje y créditos calculados.

```json
{
  "prorrata_calculation": {
    "id": "ff0e8400-e29b-41d4-a716-446655440010",
    "tenant_id": "660e9400-e29b-41d4-a716-446655440001",
    "tax_period_id": "770e8400-e29b-41d4-a716-446655440002",
    "taxable_sales": 8000.00,
    "exempt_sales": 2000.00,
    "total_sales": 10000.00,
    "taxable_purchases": 5000.00,
    "exempt_purchases": 1000.00,
    "total_purchases": 6000.00,
    "prorrata_percentage": 80.00,
    "deductible_tax_credit": 720.00,
    "non_deductible_tax_credit": 180.00,
    "status": "calculated",
    "created_at": "2026-01-25T10:00:00Z",
    "updated_at": "2026-01-25T10:00:00Z"
  }
}
```

#### `PUT /finance/prorrata-calculations/{id}`

- Campos opcionales; recalcula automáticamente.

---

### Recurso: SUNAT

#### Validación de RUC

##### `POST /finance/sunat/validate-ruc`

- **Request body:**

```json
{
  "ruc": "20100100100"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `ruc` | string | Sí | Exactamente 11 dígitos. |

- **Response 200:** objeto `sunat_validation_result`.

```json
{
  "sunat_validation_result": {
    "id": "110e8400-e29b-41d4-a716-446655440011",
    "tenant_id": "660e9400-e29b-41d4-a716-446655440001",
    "ruc": "20100100100",
    "validation_type": "ruc",
    "is_valid": true,
    "message": "RUC is valid",
    "validated_at": "2026-01-25T10:00:00Z",
    "created_at": "2026-01-25T10:00:00Z"
  }
}
```

- **Nota:** la validación actual es local (longitud = 11). No consulta SUNAT en tiempo real.

#### Archivos de Declaración (`SUNATDeclarationFile`)

Representa archivos PLE/SIRE/PLAME listos para declarar.

**Tipos (`declaration_type`):**

- `sire_sales` — SIRE ventas.
- `sire_purchases` — SIRE compras.
- `ple_sales` — PLE ventas.
- `ple_purchases` — PLE compras.
- `plame` — PLAME.

**Estados:** `pending`, `generated`, `submitted`.

##### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/finance/sunat/declaration-files` | Listar archivos. |
| `POST` | `/finance/sunat/declaration-files` | Crear archivo. |
| `GET` | `/finance/sunat/declaration-files/{id}` | Obtener archivo. |
| `PUT` | `/finance/sunat/declaration-files/{id}` | Actualizar archivo. |
| `DELETE` | `/finance/sunat/declaration-files/{id}` | Eliminar. |
| `POST` | `/finance/sunat/declaration-files/{id}/generate` | Marcar como generado. |
| `POST` | `/finance/sunat/declaration-files/{id}/submit` | Marcar como presentado. |

##### `POST /finance/sunat/declaration-files`

- **Request body:**

```json
{
  "tax_period_id": "770e8400-e29b-41d4-a716-446655440002",
  "declaration_type": "ple_sales",
  "file_name": "LE20100100100202601001000111.txt",
  "file_content": "MTAxf...",
  "status": "pending"
}
```

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `tax_period_id` | uuid | Sí | Periodo tributario. |
| `declaration_type` | string | Sí | Tipos válidos. |
| `file_name` | string | Sí | Máx. 255 caracteres. |
| `file_content` | string (base64 bytes) | Sí | Contenido del archivo. |
| `status` | string | Sí | Estados válidos. |

- **Response 201:** objeto `sunat_declaration_file`.

##### `POST /finance/sunat/declaration-files/{id}/generate`

- **Response 200:** archivo con `status` = `generated`.

##### `POST /finance/sunat/declaration-files/{id}/submit`

- **Response 200:** archivo con `status` = `submitted`.

---

## 5. Códigos y estados de dominio

| Enum / Constante | Valores posibles | Uso |
|------------------|------------------|-----|
| `TaxRegime` | `general`, `mype_tributario`, `rer`, `regimen_especial` | Régimen tributario del contribuyente. |
| `TaxPeriodStatus` | `draft`, `declared`, `paid`, `closed` | Estado del periodo tributario. |
| `InvoiceFlow` | `sale`, `purchase` | Flujo de la factura. |
| `InvoiceType` | `01`, `03`, `07`, `08`, `09`, `12`, `40` | Tipo de comprobante SUNAT. |
| `PayrollPeriodStatus` | `draft`, `approved`, `paid`, `closed` | Estado de planilla mensual. |
| `PensionSystem` | `ONP`, `AFP`, `MIXED`, `EXCLUDED` | Sistema de pensión del trabajador. |
| `FeeReceiptStatus` | `draft`, `declared`, `paid`, `canceled` | Estado de recibo por honorarios. |
| `FeeReceiptType` | `recibo_honorarios` | Tipo de recibo (actualmente único). |
| `SecondCategoryIncomeType` | `dividends`, `interest`, `royalties`, `others` | Tipo de renta de segunda categoría. |
| `SecondCategoryIncomeStatus` | `draft`, `declared`, `paid` | Estado de renta de segunda categoría. |
| `DetractionStatus` | `pending`, `deposited`, `applied` | Estado de detracción. |
| `ProrrataCalculationStatus` | `draft`, `calculated`, `applied` | Estado de cálculo de prorrata. |
| `SUNATValidationType` | `ruc`, `dni`, `receipt` | Tipo de validación SUNAT. |
| `SUNATDeclarationType` | `sire_sales`, `sire_purchases`, `ple_sales`, `ple_purchases`, `plame` | Tipo de archivo de declaración. |
| `SUNATDeclarationFileStatus` | `pending`, `generated`, `submitted` | Estado del archivo de declaración. |

**Constantes numéricas:**

- `IGVRate = 0.18` (18%) — usado en cálculo de prorrata y liquidación.
- `DefaultIRWithholdingRate = 0.08` (8%) — retención IR por defecto en recibos por honorarios.
- `defaultIncomeTaxCoefficient = 0.015` (1.5%) — coeficiente mensual de pago a cuenta de renta.

---

## 6. Manejo de errores

### Formato estándar de error

Todas las respuestas usan el envelope de `pkg/result`:

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "ruc must have 11 characters"
  },
  "meta": {
    "request_id": "req-123",
    "tenant_id": "660e9400-e29b-41d4-a716-446655440001"
  }
}
```

### Códigos HTTP usados

| Código | Significado | Cuándo ocurre |
|--------|-------------|---------------|
| `200` | OK | Operación exitosa que devuelve datos. |
| `201` | Created | Creación exitosa. |
| `204` | No Content | Eliminación lógica exitosa. |
| `400` | Bad Request | Error de validación del request (body, query, formato de fecha, etc.). |
| `401` | Unauthorized | Token JWT ausente, inválido o expirado. |
| `403` | Forbidden | Usuario autenticado pero sin rol `owner`/`admin`; o `tenant_id` inválido. |
| `404` | Not Found | Recurso solicitado no existe. |
| `409` | Conflict | Violación de unicidad (periodo duplicado, invoice duplicada, etc.). |
| `500` | Internal Server Error | Error inesperado del servidor/base de datos. |
| `501` | Not Implemented | Lógica aún no implementada (raro en este módulo). |

### Códigos de error (`error.code`)

| Código | Descripción |
|--------|-------------|
| `validation_error` | Datos inválidos o faltantes. |
| `not_found` | Recurso no encontrado. |
| `conflict` | Recurso duplicado o restricción de unicidad. |
| `unauthorized` | No autenticado. |
| `forbidden` | Sin permisos (rol o tenant inválido). |
| `internal_server_error` | Error interno. |

### Errores específicos de validación comunes

- `"ruc must have 11 characters"` — RUC no tiene 11 dígitos.
- `"tax_regime is invalid"` — régimen no soportado.
- `"year is out of range"` / `"month must be between 1 and 12"`.
- `"flow is invalid"` / `"document_type is invalid"`.
- `"exchange_rate must be greater than zero"`.
- `"total_amount cannot be negative"`.
- `"pension_system is invalid"`.
- `"status is invalid"`.
- `"invalid issue_date format"` / `"invalid income_date format"` / `"invalid operation_date format"`.
- `"invoices cannot be empty"` — bulk import sin elementos.

---

## 7. Consideraciones de integración

### Facturas y `exchange_rate`

- Siempre enviar `currency` de 3 caracteres (`PEN`, `USD`, etc.).
- Para operaciones en soles (`PEN`) enviar `exchange_rate: 1.0`.
- Para operaciones en dólares u otra moneda, enviar el tipo de cambio correspondiente.
- El backend no convierte automáticamente montos; los valores reportados deben estar en la moneda del comprobante y el tipo de cambio se almacena como referencia.

### Cálculo automático de retenciones, prorrata y detracciones

- **Recibos por honorarios:** si `ir_withholding_rate` es `0`, se aplica `0.08` (8%). Los campos `ir_withholding_amount` y `net_amount` se calculan automáticamente.
- **Renta de segunda categoría:** `withholding_amount` y `net_amount` se calculan a partir de `gross_amount * withholding_rate`.
- **Detracciones:** `detraction_amount` se calcula como `taxable_amount * detraction_percentage / 100`.
- **Prorrata:** `total_sales`, `total_purchases`, `prorrata_percentage`, `deductible_tax_credit` y `non_deductible_tax_credit` se calculan automáticamente.
- **Liquidación de impuestos:** todos los montos IGV, prorrata, renta y total a pagar se calculan a partir de las facturas del periodo.

### Campos obligatorios vs opcionales

- En cada endpoint, los campos marcados como **Sí** en las tablas son obligatorios.
- Campos de monto numérico no requeridos tienen default `0` y validación `≥ 0`.
- Campos booleanos no enviados toman el valor `false` por defecto en Go.
- Campos de fecha opcionales pueden enviarse como `null` o omitirse.

### Recomendaciones de UX

1. **Crear el perfil tributario antes de cualquier operación.** Sin RUC y régimen válidos, no se puede interpretar correctamente la liquidación.
2. **Crear el periodo tributario antes de cargar facturas.** Las facturas requieren un `tax_period_id` existente.
3. **Calcular impuestos antes de declarar.** Use `POST /tax-calculations/{tax_period_id}/calculate` para ver el resultado antes de cambiar el estado del periodo a `declared`.
4. **Recalcular tras cambios.** Si se agregan/modifican facturas, vuelva a llamar `/recalculate` para mantener la liquidación actualizada.
5. **Cerrar periodos con precaución.** Una vez `closed`, el periodo no debería seguir editándose (controlado por el frontend; el backend permite updates mientras el registro exista).
6. **Validar RUCs de contrapartes.** Use `POST /sunat/validate-ruc` como pre-check local; no reemplaza la validación oficial de SUNAT.
7. **Manejar el envelope.** Todas las respuestas incluyen `success`, `data` y `meta`. Los errores incluyen `error.code` y `error.message`.

---

## Referencias de código

- Rutas: `internal/finance/transport/handler.go`
- DTOs HTTP: `internal/finance/transport/*_handlers.go`
- Casos de uso: `internal/finance/usecase/usecases.go`, `internal/finance/usecase/*_usecase.go`
- Entidades/estados: `internal/finance/domain/*.go`
- Interfaces de repositorio: `internal/finance/repository/*.go`
- Autorización: `cmd/arpify-api/main.go` (grupo `/finance` bajo `RequireRole(owner, admin)`)
- Envelope de respuestas: `pkg/result/envelope.go`
- Errores compartidos: `internal/shared/errors/api_errors.go`
