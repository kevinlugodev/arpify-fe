# Guía de Integración - Arpify API

Documento orientado a agentes/integradores que necesiten consumir todas las APIs de Arpify y construir interfaces (web, móvil, admin, etc.).

---

## 1. Introducción

Arpify es una API REST multi-tenant de recursos humanos. Toda la comunicación usa JSON sobre HTTP, con un formato de respuesta estandarizado (patrón **Result Envelope**) y autenticación mediante JWT.

Cada empresa/cliente es un **tenant** aislado. La mayoría de endpoints requieren:

- Header `Authorization: Bearer <access_token>`
- Header `X-Tenant-Id: <uuid_del_tenant>`

---

## 2. Entorno y URL base

| Entorno | Base URL |
|---------|----------|
| Desarrollo local | `http://localhost:8080/v1` |
| Producción (ejemplo con subdominio) | `https://{tenant-slug}.arpify.com/v1` |

> En producción el tenant se resuelve por el subdominio. En desarrollo local se puede enviar `X-Tenant-Slug` o `X-Tenant-Id`.

---

## 3. Formato de respuesta: Result Envelope

Todas las respuestas comparten el mismo formato base:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "request_id": "...",
    "tenant_id": "..."
  }
}
```

### Respuesta exitosa

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@acme.com",
    "role": "OWNER"
  },
  "meta": {
    "request_id": "Kevin/hRxBl9lGU5-000003",
    "tenant_id": "11111111-2222-3333-4444-555555555555"
  }
}
```

### Respuesta de error

```json
{
  "success": false,
  "error": {
    "code": "unauthorized",
    "message": "invalid email or password"
  },
  "meta": {
    "request_id": "...",
    "tenant_id": "..."
  }
}
```

### Campos del envelope

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `success` | boolean | `true` si la operación fue exitosa |
| `data` | object / null | Payload específico del endpoint |
| `error` | object / null | Presente solo cuando `success` es `false` |
| `error.code` | string | Código corto del error |
| `error.message` | string | Mensaje legible del error |
| `meta.request_id` | string | ID de correlación de la petición |
| `meta.tenant_id` | string | Tenant que atendió la petición |

---

## 4. Autenticación

### 4.1 JWT Bearer

Después de iniciar sesión, todas las peticiones protegidas deben incluir:

```http
Authorization: Bearer <access_token>
```

El access token expira en **15 minutos** por defecto. El refresh token expira en **7 días**.

### 4.2 Resolución del tenant

El sistema resuelve el tenant en el siguiente orden de prioridad:

1. **`X-Tenant-Id`**: UUID directo del tenant.
2. **`X-Tenant-Slug`**: slug legible del tenant (ej. `acme`).
3. **Subdominio del header `Host`**: ej. `acme.localhost:8080` → slug `acme`.

**Notas:**

- Para endpoints **públicos** de autenticación (`/auth/signin`, `/auth/password/*`, `/auth/refresh`) se requiere al menos uno de los mecanismos anteriores.
- Para endpoints **protegidos** se requiere `Authorization` y también `X-Tenant-Id` (aunque el token JWT ya contiene `tenant_id`, el middleware actual lo exige por header).
- En una web/móvil real, el `X-Tenant-Id`/`X-Tenant-Slug` no debería ser visible para el usuario final; se resuelve por subdominio o workspace.

---

## 5. Roles y permisos

| Rol | Descripción | Permisos principales |
|-----|-------------|----------------------|
| `OWNER` | Propietario del tenant | Todo |
| `ADMIN` | Administrador | Todo excepto algunas operaciones de ownership |
| `HR` | Recursos humanos | Equipos, datos maestros, correos masivos |
| `SUPERVISOR` | Supervisor | Lectura de equipos y datos maestros |
| `EMPLOYEE` | Empleado | Lectura de equipos |

### Jerarquía de rutas protegidas

```
/v1
├── /health                    (público)
├── /auth/*                    (público)
├── /seed                      (público, solo desarrollo)
│
└── / (protegido: Auth + Tenant middleware)
    ├── /me                    (cualquier usuario autenticado)
    ├── /teams                 (OWNER, ADMIN, HR)
    ├── /master/*              (OWNER, ADMIN, HR)
    ├── /mass-emails/*         (OWNER, ADMIN)
    ├── /me/audit-logs         (cualquier usuario autenticado según spec)
    └── /audit/*               (OWNER, ADMIN)
```

---

## 6. Manejo de errores comunes

| Código HTTP | `error.code` | Cuándo ocurre |
|-------------|--------------|---------------|
| 400 | `validation_error` | Body malformado o campos inválidos |
| 401 | `unauthorized` | Falta token, token inválido o credenciales incorrectas |
| 403 | `forbidden` | Falta `X-Tenant-Id`, tenant inválido o rol insuficiente |
| 404 | `not_found` | Recurso no existe |
| 409 | `conflict` | Conflicto de datos (email duplicado, etc.) |
| 429 | `too_many_requests` | Rate limit (ej. recuperación de contraseña) |
| 500 | `internal_server_error` | Error interno |
| 501 | `not_implemented` | Funcionalidad aún no implementada |

---

## 7. Flujo recomendado

### 7.1 Primer uso (desarrollo)

**Paso 1:** Crear tenant y owner con `/seed`.

**Paso 2:** Guardar `tenant_id` y `tenant_slug` de la respuesta.

**Paso 3:** Iniciar sesión con `/auth/signin` enviando `X-Tenant-Slug` (o `X-Tenant-Id`).

**Paso 4:** Guardar `access_token` y `refresh_token`.

**Paso 5:** Consumir endpoints protegidos con `Authorization: Bearer <access_token>` y `X-Tenant-Id`.

**Paso 6:** Refrescar token con `/auth/refresh` cuando el access token expire.

### 7.2 Flujo de recuperación de contraseña

1. `POST /auth/password/recover` → envía email, genera código.
2. `POST /auth/password/verify-code` → verifica el código.
3. `POST /auth/password/reset` → cambia la contraseña con el código.

---

## 8. Endpoints

### 8.1 Sistema

#### `GET /health`

Verifica que el servicio esté activo.

- **Auth:** Pública
- **Response 200:**

```json
{
  "success": true,
  "data": { "status": "ok" }
}
```

---

### 8.2 Seed (desarrollo)

#### `POST /seed`

Crea el primer tenant y un usuario OWNER. No requiere autenticación.

- **Auth:** Pública
- **Headers:** Ninguno especial (opcionalmente nada de tenant)
- **Request:**

```json
{
  "tenant_name": "Acme Corp",
  "tenant_slug": "acme",
  "owner_email": "admin@acme.com",
  "owner_password": "Password123!"
}
```

- **Response 201:**

```json
{
  "success": true,
  "data": {
    "tenant_id": "11111111-2222-3333-4444-555555555555",
    "tenant_slug": "acme",
    "user_id": "22222222-3333-4444-5555-666666666666",
    "email": "admin@acme.com",
    "role": "OWNER"
  }
}
```

- **Notas:**
  - `tenant_slug` es opcional. Si no se envía, se genera desde el nombre con un sufijo aleatorio.
  - Si el tenant o usuario ya existen, se devuelven los existentes (idempotente).

---

### 8.3 Autenticación

Todos los endpoints de auth son **públicos** pero requieren resolución de tenant (`X-Tenant-Id`, `X-Tenant-Slug` o subdominio).

#### `POST /auth/signin`

Inicia sesión con email y password.

- **Request:**

```json
{
  "email": "admin@acme.com",
  "password": "Password123!"
}
```

- **Response 200:**

```json
{
  "success": true,
  "data": {
    "token_pair": {
      "access_token": "eyJhbG...",
      "refresh_token": "eyJhbG...",
      "expires_in": 900
    },
    "user": {
      "id": "...",
      "email": "admin@acme.com",
      "role": "OWNER",
      "tenant_id": "...",
      "team_member_id": null,
      "is_active": true,
      "created_at": "2026-07-17T21:00:00Z",
      "updated_at": "2026-07-17T21:00:00Z"
    }
  }
}
```

- **Errores comunes:**
  - `401 unauthorized` → credenciales inválidas o cuenta desactivada.
  - `403 forbidden` → `invalid tenant id` (falta tenant).

#### `POST /auth/refresh`

Obtiene un nuevo par de tokens usando el refresh token.

- **Request:**

```json
{
  "refresh_token": "eyJhbG..."
}
```

- **Response 200:**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbG...",
    "refresh_token": "eyJhbG...",
    "expires_in": 900
  }
}
```

- **Nota:** el refresh token antiguo se revoca y se emite uno nuevo (rotación).

#### `POST /auth/password/recover`

Inicia recuperación de contraseña. Genera un código numérico de 6 dígitos y lo envía por email.

- **Request:**

```json
{
  "email": "admin@acme.com"
}
```

- **Response 202:**

```json
{
  "success": true,
  "data": {}
}
```

- **Notas:**
  - Rate limit: máximo 5 intentos por hora por tenant+email.
  - El código expira en 10 minutos.

#### `POST /auth/password/verify-code`

Verifica que el código de recuperación sea válido.

- **Request:**

```json
{
  "email": "admin@acme.com",
  "code": "123456"
}
```

- **Response 200:**

```json
{
  "success": true,
  "data": {}
}
```

#### `POST /auth/password/reset`

Cambia la contraseña usando el código verificado.

- **Request:**

```json
{
  "email": "admin@acme.com",
  "code": "123456",
  "new_password": "NuevaPassword123!"
}
```

- **Response 200:**

```json
{
  "success": true,
  "data": {}
}
```

- **Nota:** después del reset se revocan todos los refresh tokens activos.

---

### 8.4 Mi Cuenta (`/me`)

Endpoints protegidos. Requieren `Authorization` + `X-Tenant-Id`.

#### `GET /me`

Obtiene el perfil del usuario autenticado.

- **Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "...",
    "tenant_id": "...",
    "email": "admin@acme.com",
    "role": "OWNER",
    "first_name": "...",
    "last_name": "...",
    "phone": "...",
    "address": "...",
    "photo_url": null,
    "has_password": true,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

#### `PUT /me`

Actualiza el perfil.

- **Request:**

```json
{
  "first_name": "Juan",
  "last_name": "Pérez",
  "phone": "+51 999 999 999",
  "address": "Lima, Perú",
  "photo_url": "https://..."
}
```

- **Response 200:**

```json
{
  "success": true,
  "data": {}
}
```

#### `POST /me/change-password`

Cambia la contraseña del usuario autenticado.

- **Request:**

```json
{
  "current_password": "Password123!",
  "new_password": "NuevaPassword123!"
}
```

- **Response 200:**

```json
{
  "success": true,
  "data": {}
}
```

- **Nota:** revoca todos los refresh tokens.

---

### 8.5 Equipos (`/teams`)

Requiere rol `OWNER`, `ADMIN` o `HR`.

#### `GET /teams`

Lista miembros del equipo.

- **Query params opcionales:**
  - `status`: `active`, `inactive`, `on_leave`, `terminated`, `suspended`
  - `management_id`: UUID
  - `area_id`: UUID
  - `search`: string
  - `limit`: integer, default 20
  - `offset`: integer, default 0

- **Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [ { "id": "...", "first_name": "...", ... } ],
    "total": 1
  }
}
```

#### `POST /teams`

Crea un miembro del equipo. Opcionalmente crea una cuenta de usuario.

- **Request:**

```json
{
  "first_name": "Ana",
  "last_name": "García",
  "email": "ana@acme.com",
  "phone": "+51 999 999 999",
  "document_type": "DNI",
  "document_number": "12345678",
  "position": "Desarrolladora",
  "management_id": "...",
  "area_id": "...",
  "create_account": true,
  "hire_date": "2026-07-17"
}
```

- **Response 201:**

```json
{
  "success": true,
  "data": {
    "team_member": {
      "id": "...",
      "tenant_id": "...",
      "first_name": "Ana",
      "last_name": "García",
      "email": "ana@acme.com",
      "document_type": "DNI",
      "document_number": "12345678",
      "status": "active",
      "has_account": true,
      ...
    }
  }
}
```

- **Nota:** si `create_account: true`, se crea un usuario `EMPLOYEE` con contraseña temporal (`ChangeMe123!`). Esto está pendiente de mejora para enviar invitación por email.

#### `GET /teams/{id}`

Obtiene un miembro del equipo.

#### `PUT /teams/{id}`

Actualiza un miembro del equipo.

#### `DELETE /teams/{id}`

Desactiva un miembro del equipo (soft-delete).

- **Request (opcional):**

```json
{
  "reason": "Renuncia voluntaria"
}
```

- **Response 204:**

```json
{
  "success": true,
  "data": {}
}
```

#### `POST /teams/{id}/assign-responsible`

Asigna al miembro como responsable de una gerencia o área.

- **Request:**

```json
{
  "management_id": "...",
  "area_id": "..."
}
```

#### `POST /teams/{id}/photo`

Sube foto del miembro. **Actualmente no implementado** (retorna 501).

---

### 8.6 Documentos (`/teams/{team_id}/folders`, `/teams/{team_id}/files`)

Requiere rol `OWNER`, `ADMIN` o `HR`.

Los documentos se almacenan en un object store (actualmente MinIO en desarrollo). Los metadatos quedan en PostgreSQL.

#### `POST /teams/{team_id}/folders`

Crea una carpeta.

- **Request:**

```json
{
  "name": "Contratos",
  "parent_id": null
}
```

- **Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "...",
    "tenant_id": "...",
    "owner_team_member_id": "...",
    "parent_id": null,
    "name": "Contratos",
    "created_at": "..."
  }
}
```

#### `GET /teams/{team_id}/folders/{folder_id}`

Lista el contenido de una carpeta (subcarpetas y archivos).

- **Response 200:**

```json
{
  "success": true,
  "data": {
    "folders": [ ... ],
    "files": [ ... ]
  }
}
```

#### `POST /teams/{team_id}/files`

Sube un archivo.

- **Content-Type:** `multipart/form-data`
- **Campos:**
  - `file`: archivo binario (obligatorio)
  - `folder_id`: UUID (opcional)

- **Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "...",
    "tenant_id": "...",
    "owner_team_member_id": "...",
    "folder_id": null,
    "storage_key": "tenant/.../files/.../document.pdf",
    "filename": "document.pdf",
    "size": 12345,
    "content_type": "application/pdf",
    "download_url": "...",
    "created_at": "..."
  }
}
```

#### `GET /teams/{team_id}/files/{file_id}`

Obtiene metadatos del archivo y URL de descarga.

#### `DELETE /teams/{team_id}/files/{file_id}`

Elimina el archivo.

- **Response 204.**

---

### 8.7 Datos Maestros (`/master`)

Requiere rol `OWNER`, `ADMIN` o `HR`.

#### `GET /master/managements`

Lista gerencias.

#### `POST /master/managements`

Crea gerencia.

- **Request:**

```json
{
  "name": "Tecnología",
  "responsible_team_member_id": null
}
```

#### `GET /master/managements/{id}`

Obtiene gerencia.

#### `PUT /master/managements/{id}`

Actualiza gerencia.

#### `DELETE /master/managements/{id}`

Elimina gerencia (soft-delete).

#### `GET /master/areas`

Lista áreas.

#### `POST /master/areas`

Crea área.

- **Request:**

```json
{
  "management_id": "...",
  "name": "Desarrollo",
  "responsible_team_member_id": null
}
```

#### `GET /master/areas/{id}`

Obtiene área.

#### `PUT /master/areas/{id}`

Actualiza área.

#### `DELETE /master/areas/{id}`

Elimina área (soft-delete).

---

### 8.8 Correos Masivos (`/mass-emails`)

Requiere rol `OWNER` o `ADMIN`.

#### `GET /mass-emails/templates`

Lista plantillas de correo.

#### `POST /mass-emails/templates`

Crea plantilla.

- **Request:**

```json
{
  "name": "Bienvenida",
  "subject_template": "Bienvenido {{.name}}",
  "body_template": "<h1>Hola {{.name}}</h1>...",
  "attachments_meta": []
}
```

#### `POST /mass-emails/templates/{id}/preview`

Previsualiza plantilla renderizada.

#### `GET /mass-emails/campaigns`

Lista campañas.

#### `POST /mass-emails/campaigns`

Crea campaña.

- **Request:**

```json
{
  "name": "Campaña de bienvenida",
  "template_id": "...",
  "schedule_type": "manual",
  "schedule_cron": null,
  "event_type": null,
  "recipient_query": {},
  "enabled": true
}
```

#### `POST /mass-emails/campaigns/{id}/run`

Ejecuta campaña manualmente.

#### `GET /mass-emails/logs`

Lista logs de envío.

---

### 8.9 Auditoría (`/me/audit-logs`, `/audit/*`)

- `GET /me/audit-logs` → logs del tenant actual.
- `GET /audit/*` → restringido a OWNER/ADMIN.

Query params:

- `entity_type`: string
- `entity_id`: UUID
- `limit`: integer
- `offset`: integer

---

## 9. Consideraciones importantes

### 9.1 Orden de ejecución inicial

1. Levantar infraestructura: `docker compose up -d`
2. Ejecutar migraciones: `make migrate-up`
3. Crear tenant/owner: `POST /seed`
4. Login: `POST /auth/signin` (con `X-Tenant-Slug`)
5. Crear datos maestros: gerencias y áreas.
6. Crear miembros del equipo.
7. Subir documentos, crear campañas, etc.

### 9.2 Gestión de tokens

- Guardar `access_token` y `refresh_token` de forma segura.
- Antes de que expire el access token (15 min), usar `/auth/refresh`.
- Si el refresh falla (`401`), redirigir a login.

### 9.3 Subida de archivos

- Usar `multipart/form-data`.
- El campo del archivo debe llamarse `file`.
- Límite actual: 32 MB por petición.

### 9.4 Multi-tenant

- Cada petición protegida debe incluir `X-Tenant-Id`.
- Un usuario no puede acceder a datos de otro tenant.
- El `tenant_id` se obtiene del seed o del JWT tras login.

### 9.5 Campos pendientes / stubs

- `POST /teams/{id}/photo` no está implementado.
- Algunas funcionalidades de correos masivos pueden estar parcialmente implementadas.
- El object store en desarrollo usa MinIO; en producción se recomienda S3.

---

## 10. Ejemplo completo en PowerShell

### 1. Seed

```powershell
$seed = Invoke-RestMethod -Uri "http://localhost:8080/v1/seed" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{
    "tenant_name": "Acme",
    "tenant_slug": "acme",
    "owner_email": "admin@acme.com",
    "owner_password": "Password123!"
  }'

$tenantId = $seed.data.tenant_id
$tenantSlug = $seed.data.tenant_slug
```

### 2. Login

```powershell
$login = Invoke-RestMethod -Uri "http://localhost:8080/v1/auth/signin" `
  -Method POST `
  -Headers @{
    "Content-Type" = "application/json"
    "X-Tenant-Slug" = $tenantSlug
  } `
  -Body '{
    "email": "admin@acme.com",
    "password": "Password123!"
  }'

$token = $login.data.token_pair.access_token
```

### 3. Crear gerencia

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/v1/master/managements" `
  -Method POST `
  -Headers @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
    "X-Tenant-Id" = $tenantId
  } `
  -Body '{ "name": "Tecnología" }'
```

### 4. Crear empleado

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/v1/teams" `
  -Method POST `
  -Headers @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
    "X-Tenant-Id" = $tenantId
  } `
  -Body '{
    "first_name": "Ana",
    "last_name": "García",
    "email": "ana@acme.com",
    "document_type": "DNI",
    "document_number": "12345678",
    "create_account": true
  }'
```

### 5. Subir archivo

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/v1/teams/{team_member_id}/files" `
  -Method POST `
  -Headers @{
    "Authorization" = "Bearer $token"
    "X-Tenant-Id" = $tenantId
  } `
  -Form @{
    file = Get-Item -Path "C:\docs\contrato.pdf"
  }
```

---

## 11. Referencias

- Especificación OpenAPI: `docs/openapi.yaml`
- Configuración local: `config/local.yaml`
- Variables de entorno: `.env.example`
