# Módulo de Clientes — Guía de Integración

## Propósito

El módulo de **Clientes** permite gestionar las empresas clientes de un tenant: datos fiscales, comerciales, de contacto, dirección fiscal y condiciones de crédito. Es la fuente principal de información del cliente para procesos de facturación, cotización y CRM.

Cada cliente pertenece a un único tenant y está aislado por Row Level Security (RLS).

---

## Alcance

- Clientes empresariales (B2B).
- Un único contacto clave por cliente (interlocutor principal).
- Estados: `active`, `inactive`, `lead`, `suspended`.
- Soft-delete: los registros eliminados conservan `deleted_at`.

---

## Relaciones con otros módulos

| Módulo | Relación |
|--------|----------|
| `auth` | `created_by` referencia a `auth.users.id`. |
| `audit` | Cada escritura (`create`, `update`, `delete`) genera una entrada en `audit.logs` con `entity_type = 'customer'`. |
| `finance` | Puede consumir `tax_id`, `default_currency`, `credit_limit` y `payment_terms_days` para facturación. |

---

## Flujo recomendado para el frontend

1. Listar clientes con `GET /api/v1/clients`.
2. Crear cliente con `POST /api/v1/clients`.
3. Editar cliente con `PUT /api/v1/clients/{id}`.
4. Consultar detalle con `GET /api/v1/clients/{id}`.
5. Eliminar cliente con `DELETE /api/v1/clients/{id}`.

---

## Roles y permisos

Todas las rutas requieren autenticación y pertenencia a un tenant. Solo usuarios con rol **OWNER** o **ADMIN** pueden acceder.

---

## Endpoints

### 1. Crear cliente

- **Método:** `POST`
- **Path:** `/api/v1/clients`
- **Headers requeridos:**
  - `Authorization: Bearer <access_token>`
  - `X-Tenant-Slug: <tenant_slug>` (o `X-Tenant-Id`)
  - `Content-Type: application/json`

#### Request body

```json
{
  "tax_id": "20609145511",
  "legal_name": "Arpa Devs S.A.C.",
  "trade_name": "Arpa Devs",
  "business_sector": "Tecnología",
  "email": "hola@arpadevs.com",
  "phone": "+51123456789",
  "website_url": "https://arpadevs.com",
  "key_contact_name": "Luis Gómez",
  "key_contact_role": "CEO",
  "key_contact_email": "luis@arpadevs.com",
  "key_contact_phone": "+51987654321",
  "billing_address": "Av. Principal 123, Of. 456",
  "city": "Lima",
  "state_province": "Lima",
  "postal_code": "15001",
  "country_code": "PE",
  "default_currency": "PEN",
  "payment_terms_days": 30,
  "credit_limit": 50000.00,
  "status": "active",
  "notes": "Cliente estratégico del sector tech."
}
```

#### Campos obligatorios

- `tax_id`
- `legal_name`
- `country_code` (ISO-3166-1 alpha-2, ej. `PE`, `US`, `MX`)
- `default_currency` (ISO-4217, ej. `PEN`, `USD`, `EUR`)

#### Campos opcionales

Todos los demás. Si `status` no se envía, el valor por defecto es `active`.

#### Response 201 Created

```json
{
  "success": true,
  "data": {
    "customer": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5",
      "tax_id": "20609145511",
      "legal_name": "Arpa Devs S.A.C.",
      "trade_name": "Arpa Devs",
      "business_sector": "Tecnología",
      "email": "hola@arpadevs.com",
      "phone": "+51123456789",
      "website_url": "https://arpadevs.com",
      "key_contact_name": "Luis Gómez",
      "key_contact_role": "CEO",
      "key_contact_email": "luis@arpadevs.com",
      "key_contact_phone": "+51987654321",
      "billing_address": "Av. Principal 123, Of. 456",
      "city": "Lima",
      "state_province": "Lima",
      "postal_code": "15001",
      "country_code": "PE",
      "default_currency": "PEN",
      "payment_terms_days": 30,
      "credit_limit": 50000.00,
      "status": "active",
      "notes": "Cliente estratégico del sector tech.",
      "created_by": "17646247-7b70-4e6f-a493-1c9af1bb82f4",
      "created_at": "2026-07-31T02:00:00Z",
      "updated_at": "2026-07-31T02:00:00Z"
    }
  },
  "meta": {
    "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5"
  }
}
```

---

### 2. Listar clientes

- **Método:** `GET`
- **Path:** `/api/v1/clients`
- **Query params opcionales:**
  - `status`: filtra por estado (`active`, `inactive`, `lead`, `suspended`).
  - `search`: búsqueda parcial por `legal_name`, `trade_name` o `tax_id`.
  - `limit`: cantidad de resultados (default `20`).
  - `offset`: paginación (default `0`).

#### Ejemplo

```
GET /api/v1/clients?status=active&search=arpa&limit=10&offset=0
```

#### Response 200 OK

```json
{
  "success": true,
  "data": {
    "items": [
      { "customer": { ... } }
    ],
    "total": 1
  },
  "meta": {
    "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5"
  }
}
```

---

### 3. Obtener cliente por ID

- **Método:** `GET`
- **Path:** `/api/v1/clients/{id}`

#### Response 200 OK

Igual estructura que la creación.

---

### 4. Actualizar cliente

- **Método:** `PUT`
- **Path:** `/api/v1/clients/{id}`

#### Request body

Solo se envían los campos a modificar. Todos son opcionales.

```json
{
  "status": "inactive",
  "credit_limit": 75000.00,
  "notes": "Límite de crédito actualizado."
}
```

#### Response 200 OK

Devuelve el cliente completo actualizado.

---

### 5. Eliminar cliente

- **Método:** `DELETE`
- **Path:** `/api/v1/clients/{id}`

#### Response 204 No Content

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
| 400 | `validation_error` | Body inválido, email mal formado, `status` no válido, `payment_terms_days` o `credit_limit` negativos. |
| 401 | `unauthorized` | Token ausente, inválido o expirado. |
| 403 | `forbidden` | Usuario sin rol OWNER/ADMIN o `tenant_id` inválido. |
| 404 | `not_found` | Cliente no existe o fue eliminado. |
| 409 | `conflict` | Ya existe un cliente con el mismo `tax_id` en el tenant. |
| 500 | `internal_server_error` | Error inesperado del servidor. |

### Ejemplo de error

```json
{
  "success": false,
  "error": {
    "code": "conflict",
    "message": "customer with this tax id already exists"
  },
  "meta": {
    "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5"
  }
}
```

---

## Notas técnicas

- `country_code` debe ser código ISO de 2 caracteres en mayúsculas o minúsculas.
- `default_currency` debe ser código ISO de 3 caracteres.
- `credit_limit` se almacena con 2 decimales (`DECIMAL(18,2)`).
- El campo `created_by` se completa automáticamente con el usuario autenticado.
- Las operaciones de escritura generan auditoría. Si la auditoría falla, la operación principal no se revierte, pero se registra un warning en logs.

---

## Archivos relacionados

- `migrations/0007_clients_schema.sql`
- `migrations/0008_clients_rls_policy.sql`
- `internal/clients/domain/entity.go`
- `internal/clients/repository/repository.go`
- `internal/clients/repository/postgres/customer_postgres.go`
- `internal/clients/usecase/usecases.go`
- `internal/clients/transport/http_handlers.go`
