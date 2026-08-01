# Integración de Catálogo de Bancos y Cuentas Bancarias — Tesorería

## Propósito

Este documento describe cómo integrar el catálogo global de bancos (`master.banks`) con el módulo de Tesorería. El objetivo es permitir que el frontend seleccione un banco desde una lista controlada al crear o editar una cuenta bancaria, eliminando el uso de texto libre.

## Cambio principal

El campo `bank_name` (texto libre) de `treasury.bank_accounts` fue reemplazado por `bank_id`, una FK al catálogo global `master.banks`.

| Antes | Después |
|-------|---------|
| `bank_name: "BCP"` (texto libre) | `bank_id: "uuid-del-banco"` (FK a `master.banks`) |
| No había catálogo | `GET /api/v1/treasury/banks` devuelve el catálogo |

## Alcance

- Catálogo global de bancos peruanos precargado.
- Endpoints para listar y obtener bancos.
- Creación y actualización de cuentas bancarias ahora requiere/envía `bank_id`.
- El nombre del banco se resuelve automáticamente en las respuestas de `bank_accounts`.

---

## Relaciones

```text
master.banks (catálogo global)
    │
    └── treasury.bank_accounts.bank_id (FK)
```

- Un banco puede tener muchas cuentas bancarias.
- Una cuenta bancaria pertenece a un solo banco.

---

## Flujo recomendado para el frontend

1. Cargar el catálogo de bancos con `GET /api/v1/treasury/banks`.
2. Mostrar el selector usando `short_name` o `name`.
3. Al crear cuenta bancaria, enviar el `bank_id` seleccionado en `POST /api/v1/treasury/bank-accounts`.
4. Al editar, opcionalmente enviar un `bank_id` diferente en `PUT /api/v1/treasury/bank-accounts/{id}`.
5. En listados y detalle, mostrar `bank_name` que viene resuelto desde el catálogo.

---

## Roles y permisos

Todas las rutas bajo `/api/v1/treasury` requieren:

- Autenticación JWT válida.
- Rol **OWNER** o **ADMIN**.
- Header de tenant (`X-Tenant-Slug` o `X-Tenant-Id`).

---

## Endpoints

### 1. Listar bancos

Obtiene el catálogo global de bancos. Útil para llenar selectores.

- **Método:** `GET`
- **Path:** `/api/v1/treasury/banks`
- **Headers requeridos:**
  - `Authorization: Bearer <access_token>`
  - `X-Tenant-Slug: <tenant_slug>`

#### Query params opcionales

| Parámetro | Descripción |
|-----------|-------------|
| `active_only` | Default `true`. Enviar `false` para incluir inactivos. |
| `country_code` | Filtrar por país, ej. `PE`. |
| `limit` | Cantidad de resultados (default `20`). |
| `offset` | Paginación (default `0`). |

#### Response 200 OK

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
  "meta": {
    "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5"
  }
}
```

---

### 2. Obtener banco por ID

- **Método:** `GET`
- **Path:** `/api/v1/treasury/banks/{id}`

#### Response 200 OK

Igual estructura que un item del listado.

---

### 3. Crear cuenta bancaria (con `bank_id`)

- **Método:** `POST`
- **Path:** `/api/v1/treasury/bank-accounts`

#### Request body

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

#### Campos

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `bank_id` | uuid | Sí | ID del banco en `master.banks`. Debe existir y estar activo. |
| `name` | string | Sí | Nombre propio de la cuenta. Único por tenant. |
| `account_number` | string | No | Número de cuenta. |
| `cci` | string | No | Código de cuenta interbancaria. |
| `currency` | string | Sí | `PEN` o `USD`. |
| `real_balance` | float | No | Default `0`. ≥ 0. |
| `is_active` | bool | No | Default `true`. |

#### Response 201 Created

```json
{
  "success": true,
  "data": {
    "bank_account": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5",
      "bank_id": "11111111-1111-1111-1111-111111111111",
      "bank_name": "Banco de Crédito del Perú",
      "name": "Cuenta Operativa USD",
      "account_number": "123-4567890-0-12",
      "cci": "00212345678901234567",
      "currency": "USD",
      "real_balance": 1000.00,
      "reserved_amount": 0,
      "is_active": true,
      "created_at": "2026-07-31T00:00:00Z",
      "updated_at": "2026-07-31T00:00:00Z"
    }
  },
  "meta": {
    "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5"
  }
}
```

---

### 4. Actualizar cuenta bancaria

- **Método:** `PUT`
- **Path:** `/api/v1/treasury/bank-accounts/{id}`

#### Request body

Todos los campos son opcionales. Para cambiar de banco, enviar `bank_id`.

```json
{
  "bank_id": "22222222-2222-2222-2222-222222222222",
  "name": "Cuenta Principal Interbank",
  "is_active": false
}
```

#### Response 200 OK

Devuelve la cuenta bancaria completa actualizada, con `bank_name` resuelto.

---

### 5. Listar cuentas bancarias

- **Método:** `GET`
- **Path:** `/api/v1/treasury/bank-accounts`

#### Query params opcionales

| Parámetro | Descripción |
|-----------|-------------|
| `active_only` | Solo cuentas activas. |
| `limit` | Default `20`. |
| `offset` | Default `0`. |

#### Response 200 OK

Cada item incluye `bank_id` y `bank_name`.

---

### 6. Obtener cuenta bancaria por ID

- **Método:** `GET`
- **Path:** `/api/v1/treasury/bank-accounts/{id}`

#### Response 200 OK

Incluye `bank_id` y `bank_name` resuelto desde el catálogo.

---

### 7. Eliminar cuenta bancaria

- **Método:** `DELETE`
- **Path:** `/api/v1/treasury/bank-accounts/{id}`

#### Response 200 OK

```json
{
  "success": true,
  "data": {},
  "meta": {
    "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5"
  }
}
```

---

## Tipos de error

| Código HTTP | Código de error | Cuándo ocurre |
|-------------|-----------------|---------------|
| 400 | `validation_error` | `bank_id` ausente, inválido, inactivo o UUID mal formado. También validaciones de `name`, `currency`, etc. |
| 401 | `unauthorized` | Token ausente, inválido o expirado. |
| 403 | `forbidden` | Usuario sin rol OWNER/ADMIN o tenant inválido. |
| 404 | `not_found` | Cuenta bancaria o banco no existe. |
| 409 | `conflict` | Ya existe una cuenta con el mismo `name` en el tenant. |
| 500 | `internal_server_error` | Error inesperado del servidor. |

### Ejemplo de error

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "bank_id is invalid"
  },
  "meta": {
    "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5"
  }
}
```

---

## Notas técnicas

- `bank_name` ya no se almacena en `treasury.bank_accounts`; se obtiene por `JOIN` con `master.banks`.
- El catálogo `master.banks` es global: no tiene `tenant_id`.
- Para crear una cuenta bancaria, primero se debe consultar `GET /api/v1/treasury/banks` y enviar el `id` del banco seleccionado.
- Si se necesita un banco que no esté en el catálogo, debe agregarse directamente a `master.banks` (por ahora no hay endpoint de administración de catálogo; se hace vía migración o seed).
- Las migraciones involucradas son `0011_master_banks.sql` y `0012_treasury_bank_accounts_bank_id.sql`.

---

## Archivos relacionados

- `migrations/0011_master_banks.sql`
- `migrations/0012_treasury_bank_accounts_bank_id.sql`
- `internal/treasury/domain/entity.go`
- `internal/treasury/repository/repository.go`
- `internal/treasury/repository/postgres/treasury_postgres.go`
- `internal/treasury/usecase/usecases.go`
- `internal/treasury/transport/http_handlers.go`
- `docs/treasury-api-integration.md`
