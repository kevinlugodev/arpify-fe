# Sign Up / Creación de cuenta — Guía de Integración

## Propósito

El endpoint `POST /api/v1/auth/signup` permite crear una **nueva cuenta de empresa (tenant)** en Arpify con los datos mínimos necesarios:

- Correo electrónico del administrador.
- Contraseña.
- Nombre de la empresa.

Al ejecutarse correctamente, el backend crea automáticamente:

1. Un registro en la tabla `tenants`.
2. Un usuario `OWNER` en `auth.users` asociado a ese tenant.
3. Un par de tokens JWT (access + refresh), igual que en el login.

El usuario puede completar sus datos personales más adelante dentro de la plataforma.

---

## Alcance

- Registro público: **no requiere autenticación ni header de tenant**.
- Crea un tenant y su primer usuario administrador.
- El rol asignado al usuario es `OWNER` (máximo permiso del sistema).
- El email debe ser único en todo el sistema (global), no solo dentro de un tenant.
- El slug del tenant se genera automáticamente a partir del nombre de la empresa.

---

## Relaciones con otros módulos

| Módulo / Tabla | Relación |
|----------------|----------|
| `tenants` | Se crea el registro de la empresa. El campo `slug` es único. |
| `auth.users` | Se crea el usuario OWNER vinculado al nuevo `tenant_id`. |
| `auth.tokens` (Redis) | Se almacena el refresh token para permitir su posterior rotación. |
| `teams` | Opcionalmente, más adelante se puede crear un `team_member` vinculado a este usuario. |

---

## Flujo recomendado para el frontend

1. Mostrar un formulario de registro con: email, contraseña, nombre de empresa.
2. Enviar `POST /api/v1/auth/signup`.
3. Si es exitoso, guardar el `token_pair` y la información del `tenant`.
4. Redirigir al dashboard o al flujo de completar perfil.
5. Usar el `access_token` en el header `Authorization: Bearer <token>` para todas las demás APIs.
6. Usar el `refresh_token` en `POST /api/v1/auth/refresh` cuando el access token expire.

---

## Endpoint

### Crear cuenta

- **Método:** `POST`
- **Path:** `/api/v1/auth/signup`
- **Autenticación:** No requerida.
- **Tenant header:** No requerido.
- **Headers requeridos:**
  - `Content-Type: application/json`

#### Request body

```json
{
  "email": "admin@arpadevs.com",
  "password": "miContraseñaSegura123",
  "company_name": "Arpa Devs"
}
```

#### Campos obligatorios

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `email` | string | Correo electrónico del administrador. Debe tener formato válido. |
| `password` | string | Contraseña. Mínimo 8 caracteres. |
| `company_name` | string | Nombre de la empresa o tenant. Mínimo 2 caracteres, máximo 255. |

#### Campos opcionales

Ninguno.

---

#### Response 201 Created

```json
{
  "success": true,
  "data": {
    "token_pair": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires_in": 3600
    },
    "user": {
      "id": "17646247-7b70-4e6f-a493-1c9af1bb82f4",
      "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5",
      "email": "admin@arpadevs.com",
      "role": "OWNER",
      "is_active": true,
      "created_at": "2026-08-03T18:00:00Z",
      "updated_at": "2026-08-03T18:00:00Z"
    },
    "tenant": {
      "id": "5e535672-21ea-4d75-ac88-391dc57a9af5",
      "name": "Arpa Devs",
      "slug": "arpadevs"
    }
  },
  "meta": {
    "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5"
  }
}
```

---

## Validaciones

| Campo | Regla |
|-------|-------|
| `email` | Requerido. Formato de email válido. Se normaliza a minúsculas. |
| `password` | Requerido. Mínimo 8 caracteres. |
| `company_name` | Requerido. Mínimo 2 caracteres, máximo 255. Se eliminan espacios al inicio y al final. |

### Reglas de negocio

- El email no debe existir previamente en `auth.users` (búsqueda global, sin importar el tenant).
- El slug generado a partir de `company_name` no debe existir en `tenants`.
- Si el slug base ya está ocupado, se agrega un sufijo numérico automático (ej. `arpadevs-2`).

---

## Generación del slug

El slug se construye automáticamente desde `company_name`:

- Se convierte a minúsculas.
- Se remueven acentos (ej. `á` → `a`).
- Caracteres no alfanuméricos se reemplazan por guiones (`-`).
- Se eliminan guiones repetidos y guiones al inicio/final.

Ejemplos:

| `company_name` | Slug generado |
|----------------|---------------|
| `Arpa Devs` | `arpa-devs` |
| `Mi Empresa S.A.C.` | `mi-empresa-sac` |
| `Tecnología & Software` | `tecnologia-software` |

---

## Tipos de error

| Código HTTP | Código de error | Cuándo ocurre |
|-------------|-----------------|---------------|
| 400 | `validation_error` | Body inválido, email mal formado, contraseña menor a 8 caracteres, `company_name` vacío o muy corto/largo. |
| 409 | `conflict` | Ya existe un usuario con ese email en el sistema, o el slug generado ya está en uso. |
| 500 | `internal_server_error` | Error inesperado del servidor (hash de password, generación de tokens, fallo en base de datos). |

### Ejemplo de error 400 — validación

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Key: 'SignUpRequest.Password' Error:Field validation for 'Password' failed on the 'min' tag"
  },
  "meta": {}
}
```

### Ejemplo de error 409 — email duplicado

```json
{
  "success": false,
  "error": {
    "code": "conflict",
    "message": "user with this email already exists"
  },
  "meta": {}
}
```

---

## Notas técnicas

- El endpoint es **público**. No debe estar protegido por `AuthMiddleware` ni `TenantMiddleware`.
- La creación de tenant y usuario OWNER se ejecuta dentro de una transacción PostgreSQL. Si falla alguno de los dos inserts, se revierte todo; no quedan registros parciales.
- El refresh token se almacena en Redis con el TTL configurado en `jwt.refresh_ttl`.
- El `access_token` y el `refresh_token` ya contienen el `tenant_id` del nuevo tenant.
- A diferencia del login, no se debe enviar `X-Tenant-Id` ni `X-Tenant-Slug`, porque el tenant se crea en este mismo request.

---

## Archivos relacionados

- `internal/auth/usecase/signup.go`
- `internal/auth/transport/http_handlers.go`
- `internal/auth/repository/repository.go`
- `internal/shared/tenant/postgres.go`
- `cmd/arpify-api/main.go`
