# HR Payroll — Guía de Integración Técnica

## 1. Propósito y funcionalidad

El módulo **HR Payroll** (Planillas) permite gestionar la remuneración mensual de los colaboradores: registrar compensaciones individuales, armar planillas mensuales, calcular descuentos y aportes, y generar las obligaciones de pago correspondientes en Tesorería.

### Funcionalidades principales

- Registrar compensaciones históricas por colaborador (`employee_compensations`): salario base, régimen laboral, sistema de pensión, datos bancarios y vigencia.
- Crear planillas mensuales (`payroll_runs`) en estado `DRAFT`.
- Agregar colaboradores a una planilla en borrador; el sistema calcula automáticamente los montos desde la compensación activa.
- Calcular descuentos y aportes:
  - `gross_earnings = base_salary`
  - Pensiones: `ONP = 13%`, cualquier `AFP = 10%` (MVP simplificado).
  - `employer_essalud = 9%`
  - `net_payable = gross_earnings - pension_deduction - other_deductions`
- Aprobar (`approve`) una planilla: recalcula totales y crea dos cuentas por pagar en Tesorería.
- Cancelar (`cancel`) una planilla que no esté `PAID` ni `CANCELLED`.
- Registrar auditoría de cada operación en la tabla `logs`.

## 2. Modelo de datos

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `hr_payroll.employee_compensations` | Historial de compensaciones por colaborador. |
| `hr_payroll.payroll_runs` | Planillas mensuales por tenant. |
| `hr_payroll.payroll_items` | Líneas de colaborador dentro de cada planilla. |

### Estados de una planilla (`payroll_run`)

| Estado | Significado | Transiciones permitidas |
|--------|-------------|--------------------------|
| `DRAFT` | Borrador, editable. | `APPROVED`, `CANCELLED` |
| `APPROVED` | Aprobada, lista para pago. | `PAID`, `CANCELLED` |
| `PAID` | Pagada. | Ninguna |
| `CANCELLED` | Cancelada. | Ninguna |

### Regímenes laborales (`labor_regime`)

- `GENERAL`
- `MYPE_SMALL`
- `MYPE_MICRO`
- `INTERN`

### Sistemas de pensión (`pension_system`)

- `ONP` — descuento del 13%
- `AFP_INTEGRA` — descuento del 10%
- `AFP_PRIMA` — descuento del 10%
- `AFP_PROFUTURO` — descuento del 10%
- `AFP_HABITAT` — descuento del 10%

### Estados de pago de ítem (`payment_status`)

- `PENDING`
- `PAID`

### Cálculo de una planilla

```
gross_earnings = base_salary
pension_deduction = gross_earnings * pension_rate
employer_essalud = gross_earnings * 0.09
net_payable = gross_earnings - pension_deduction - other_deductions

total_gross_amount = sum(gross_earnings)
total_employee_deductions = sum(pension_deduction + other_deductions)
total_employer_contributions = sum(employer_essalud)
total_net_payable = sum(net_payable)
```

## 3. Relaciones con otros módulos

```
HR Payroll
├── Teams (valida que el employee_id exista; team_members fue extendido con tax_id)
├── Treasury (crea payables RHE y TAX_SETTLEMENT al aprobar)
└── Audit (registra logs de creación, edición, cambio de estado y eliminación)
```

## 4. Base URL y autenticación

```
GET|POST|PUT|DELETE https://<host>/api/v1/hr-payroll
```

Todas las rutas requieren:

- Header `Authorization: Bearer <access_token>` con rol `OWNER` o `ADMIN`.
- El tenant se infiere del token o del header `X-Tenant-ID` según la configuración del middleware.

## 5. Endpoints

### 5.1 Crear compensación

```http
POST /api/v1/hr-payroll/compensations
```

**Request body**

```json
{
  "employee_id": "6f30a022-2f5f-442c-b9a7-d782a4c3e578",
  "base_salary": 3500.00,
  "currency": "PEN",
  "labor_regime": "GENERAL",
  "pension_system": "AFP_PRIMA",
  "cuspp_number": "12345678901",
  "has_medical_insurance": true,
  "bank_account_number": "123-4567890-0-12",
  "bank_cci": "0021231234567890123",
  "bank_name": "BCP",
  "effective_start_date": "2026-01-01",
  "effective_end_date": null
}
```

**Campos**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `employee_id` | uuid | Sí | Colaborador al que aplica. |
| `base_salary` | number | Sí | Salario base. `>= 0`. |
| `currency` | string(3) | Sí | Moneda, ej. `PEN`. |
| `labor_regime` | string | Sí | `GENERAL`, `MYPE_SMALL`, `MYPE_MICRO`, `INTERN`. |
| `pension_system` | string | Sí | `ONP`, `AFP_INTEGRA`, `AFP_PRIMA`, `AFP_PROFUTURO`, `AFP_HABITAT`. |
| `cuspp_number` | string(30) | No | Número CUSPP. |
| `has_medical_insurance` | bool | No | Default `true`. |
| `bank_account_number` | string(50) | No | Cuenta bancaria del colaborador. |
| `bank_cci` | string(50) | No | CCI de la cuenta. |
| `bank_name` | string(50) | No | Banco de la cuenta. |
| `effective_start_date` | string | Sí | Fecha de inicio de vigencia `YYYY-MM-DD`. |
| `effective_end_date` | string | No | Fecha de fin de vigencia `YYYY-MM-DD`; `null` si está vigente. |

**Response 201 Created**

```json
{
  "success": true,
  "data": {
    "compensation": {
      "id": "...",
      "tenant_id": "...",
      "employee_id": "6f30a022-2f5f-442c-b9a7-d782a4c3e578",
      "base_salary": 3500,
      "currency": "PEN",
      "labor_regime": "GENERAL",
      "pension_system": "AFP_PRIMA",
      "cuspp_number": "12345678901",
      "has_medical_insurance": true,
      "bank_account_number": "123-4567890-0-12",
      "bank_cci": "0021231234567890123",
      "bank_name": "BCP",
      "effective_start_date": "2026-01-01T00:00:00Z",
      "effective_end_date": null,
      "created_at": "2026-08-01T00:00:00Z",
      "updated_at": "2026-08-01T00:00:00Z",
      "deleted_at": null
    }
  },
  "meta": { "tenant_id": "..." }
}
```

### 5.2 Obtener compensación

```http
GET /api/v1/hr-payroll/compensations/{id}
```

**Response 200 OK**

Misma forma que el objeto `compensation` del ejemplo anterior.

### 5.3 Listar compensaciones

```http
GET /api/v1/hr-payroll/compensations?employee_id={uuid}&limit=20&offset=0
```

**Query params**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `employee_id` | uuid | Filtra por colaborador. |
| `limit` | int | Por defecto `20`. |
| `offset` | int | Por defecto `0`. |

**Response 200 OK**

```json
{
  "success": true,
  "data": {
    "items": [ /* array de compensations */ ],
    "total": 42
  },
  "meta": { "tenant_id": "..." }
}
```

### 5.4 Actualizar compensación

```http
PUT /api/v1/hr-payroll/compensations/{id}
```

Todos los campos son opcionales.

**Request body**

```json
{
  "base_salary": 3800.00,
  "effective_end_date": "2026-07-31"
}
```

**Response 200 OK**

### 5.5 Eliminar compensación

```http
DELETE /api/v1/hr-payroll/compensations/{id}
```

**Response 200 OK**

```json
{
  "success": true,
  "data": {},
  "meta": { "tenant_id": "..." }
}
```

### 5.6 Crear planilla

```http
POST /api/v1/hr-payroll/payroll-runs
```

**Request body**

```json
{
  "period_year": 2026,
  "period_month": 7
}
```

**Campos**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `period_year` | int | Sí | Año del periodo. |
| `period_month` | int | Sí | Mes del periodo (1-12). |

**Response 201 Created**

```json
{
  "success": true,
  "data": {
    "payroll_run": {
      "id": "...",
      "tenant_id": "...",
      "period_year": 2026,
      "period_month": 7,
      "total_gross_amount": 0,
      "total_employee_deductions": 0,
      "total_employer_contributions": 0,
      "total_net_payable": 0,
      "status": "DRAFT",
      "created_at": "2026-08-01T00:00:00Z",
      "updated_at": "2026-08-01T00:00:00Z",
      "deleted_at": null
    }
  },
  "meta": { "tenant_id": "..." }
}
```

### 5.7 Obtener planilla

```http
GET /api/v1/hr-payroll/payroll-runs/{id}
```

**Response 200 OK**

Misma forma que el objeto `payroll_run` del ejemplo anterior.

### 5.8 Listar planillas

```http
GET /api/v1/hr-payroll/payroll-runs?status=DRAFT&limit=20&offset=0
```

**Query params**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `status` | string | Filtra por estado. |
| `limit` | int | Por defecto `20`. |
| `offset` | int | Por defecto `0`. |

**Response 200 OK**

```json
{
  "success": true,
  "data": {
    "items": [ /* array de payroll_runs */ ],
    "total": 12
  },
  "meta": { "tenant_id": "..." }
}
```

### 5.9 Actualizar planilla

```http
PUT /api/v1/hr-payroll/payroll-runs/{id}
```

Solo se puede editar si el estado es `DRAFT`.

**Request body**

```json
{
  "period_year": 2026,
  "period_month": 8
}
```

**Response 200 OK**

### 5.10 Eliminar planilla

```http
DELETE /api/v1/hr-payroll/payroll-runs/{id}
```

Solo se puede eliminar si el estado es `DRAFT`.

**Response 200 OK**

```json
{
  "success": true,
  "data": {},
  "meta": { "tenant_id": "..." }
}
```

### 5.11 Agregar colaborador a planilla

```http
POST /api/v1/hr-payroll/payroll-runs/{id}/employees
```

Sobre planillas en estado `DRAFT`. Requiere que el colaborador tenga una compensación activa.

**Request body**

```json
{
  "employee_id": "6f30a022-2f5f-442c-b9a7-d782a4c3e578",
  "other_deductions": 50.00
}
```

**Campos**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `employee_id` | uuid | Sí | Colaborador a agregar. |
| `other_deductions` | number | No | Otros descuentos. `>= 0`. Default `0`. |

**Response 201 Created**

```json
{
  "success": true,
  "data": {
    "item": {
      "id": "...",
      "tenant_id": "...",
      "payroll_run_id": "...",
      "employee_id": "6f30a022-2f5f-442c-b9a7-d782a4c3e578",
      "base_salary": 3500,
      "gross_earnings": 3500,
      "pension_deduction": 350,
      "other_deductions": 50,
      "employer_essalud": 315,
      "net_payable": 3100,
      "payment_status": "PENDING",
      "created_at": "2026-08-01T00:00:00Z",
      "updated_at": "2026-08-01T00:00:00Z",
      "deleted_at": null
    }
  },
  "meta": { "tenant_id": "..." }
}
```

### 5.12 Quitar colaborador de planilla

```http
DELETE /api/v1/hr-payroll/payroll-runs/{id}/employees/{employee_id}
```

Solo sobre planillas `DRAFT`.

**Response 200 OK**

```json
{
  "success": true,
  "data": {},
  "meta": { "tenant_id": "..." }
}
```

### 5.13 Listar ítems de una planilla

```http
GET /api/v1/hr-payroll/payroll-runs/{id}/items?limit=20&offset=0
```

**Response 200 OK**

```json
{
  "success": true,
  "data": {
    "items": [ /* array de payroll_items */ ],
    "total": 15
  },
  "meta": { "tenant_id": "..." }
}
```

### 5.14 Aprobar planilla

```http
POST /api/v1/hr-payroll/payroll-runs/{id}/approve
```

Solo planillas en estado `DRAFT`. No requiere body.

Al aprobar se ejecuta:

1. Recálculo de totales desde los ítems activos.
2. Creación de dos payables en Tesorería:
   - `RHE`: `Planilla empleados {mm/yyyy}` por `total_net_payable`.
   - `TAX_SETTLEMENT`: `SUNAT/AFP {mm/yyyy}` por `total_employee_deductions + total_employer_contributions`.
   - Ambos con estado `PENDING` y vencimiento el último día del mes de la planilla.
3. Cambio de estado a `APPROVED`.

**Response 200 OK**

### 5.15 Cancelar planilla

```http
POST /api/v1/hr-payroll/payroll-runs/{id}/cancel
```

Permitido desde `DRAFT` o `APPROVED`. No se puede cancelar una planilla `PAID` o ya `CANCELLED`.

**Response 200 OK**

## 6. Flujo recomendado en el frontend

1. Registrar las compensaciones vigentes de cada colaborador.
2. Crear la planilla mensual en estado `DRAFT`.
3. Agregar colaboradores a la planilla; el sistema calcula montos y totales.
4. Revisar totales y, si es correcto, aprobar (`approve`) la planilla.
5. En Tesorería, pagar los payables `RHE` y `TAX_SETTLEMENT` generados.
6. (Futuro) Marcar la planilla como `PAID` cuando los pagos se confirmen.

## 7. Códigos de error

| Código HTTP | `error.code` | Cuándo ocurre |
|-------------|--------------|---------------|
| 400 | `validation_error` | Campos inválidos, fechas mal formadas, transición de estado no permitida. |
| 401 | `unauthorized` | Token inválido o ausente. |
| 403 | `forbidden` | Usuario sin rol `OWNER`/`ADMIN` o tenant inválido. |
| 404 | `not_found` | Compensación, planilla, ítem o colaborador no existe. |
| 409 | `conflict` | Planilla duplicada para el mismo periodo o colaborador ya agregado a la planilla. |
| 500 | `internal_server_error` | Error inesperado del servidor. |

## 8. Consideraciones de integración

- Las fechas se envían como `YYYY-MM-DD`; el backend las convierte a `time.Time` en UTC.
- Los totales de la planilla se recalculan automáticamente al agregar, quitar o modificar ítems.
- Una compensación activa es aquella cuya `effective_start_date <= hoy` y (`effective_end_date IS NULL` o `>= hoy`).
- Solo se pueden editar/eliminar planillas en estado `DRAFT`.
- La aprobación crea payables en Tesorería; si falla la creación de alguno, la planilla no se aprueba.
