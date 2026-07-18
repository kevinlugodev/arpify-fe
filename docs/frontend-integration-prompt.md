# Prompt para Integración Frontend - Arpify API

Este documento resume los cambios y capacidades actuales del backend de Arpify para que el agente frontend integre correctamente las APIs, rutas, payloads y comportamientos esperados.

---

## 1. Base URL

Todas las APIs están bajo el prefijo `/api/v1`:

```
http://localhost:8080/api/v1
```

Antes era `/v1`, ahora es `/api/v1`.

---

## 2. Autenticación y Tenant

### Login

Endpoint: `POST /api/v1/auth/signin`

El backend resuelve el tenant en este orden:

1. Header `X-Tenant-Id` (UUID)
2. Header `X-Tenant-Slug`
3. Subdominio del `Host`

Para desarrollo local, usa `X-Tenant-Slug`:

```http
POST /api/v1/auth/signin
Content-Type: application/json
X-Tenant-Slug: miempresa

{
  "email": "admin@miempresa.com",
  "password": "Password123!"
}
```

### Respuesta de login

```json
{
  "success": true,
  "data": {
    "token_pair": {
      "access_token": "eyJ...",
      "refresh_token": "eyJ...",
      "expires_in": 900
    },
    "user": {
      "id": "...",
      "email": "admin@miempresa.com",
      "role": "OWNER",
      "tenant_id": "..."
    }
  },
  "meta": {}
}
```

**Importante:** las claves son `token_pair` y `user` (snake_case, minúsculas). Antes venían como `TokenPair` y `User`.

### Headers para endpoints protegidos

```http
Authorization: Bearer <access_token>
X-Tenant-Id: <tenant_id>
```

### Refresh token

`POST /api/v1/auth/refresh`

```json
{
  "refresh_token": "eyJ..."
}
```

Respuesta:

```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 900
  }
}
```

---

## 3. Seed (crear primer tenant)

Endpoint: `POST /api/v1/seed`

```json
{
  "tenant_name": "Mi Empresa",
  "tenant_slug": "miempresa",
  "owner_email": "admin@miempresa.com",
  "owner_password": "Password123!"
}
```

Respuesta:

```json
{
  "success": true,
  "data": {
    "tenant_id": "...",
    "tenant_slug": "miempresa",
    "user_id": "...",
    "email": "admin@miempresa.com",
    "role": "OWNER"
  }
}
```

Guarda `tenant_id` y `tenant_slug` para el login y peticiones posteriores.

---

## 4. Formato de respuesta

Todas las respuestas usan el envelope:

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

En error:

```json
{
  "success": false,
  "error": {
    "code": "unauthorized",
    "message": "..."
  }
}
```

---

## 5. CORS

El backend acepta peticiones desde `http://localhost:4200` y `http://localhost:3000` con credenciales. En producción se configuran los orígenes permitidos por variables de entorno.

---

## 6. Datos Maestros

### Gerencias (`/api/v1/master/managements`)

- `GET` lista gerencias.
- `POST` crea gerencia.
- `GET /{id}` obtiene una gerencia.
- `PUT /{id}` actualiza gerencia.
- `DELETE /{id}` elimina gerencia.

Payload:

```json
{
  "name": "Tecnología",
  "responsible_team_member_id": null
}
```

### Áreas (`/api/v1/master/areas`)

Mismos métodos que gerencias.

Payload de creación:

```json
{
  "management_id": "uuid-de-gerencia",
  "name": "Desarrollo",
  "responsible_team_member_id": null
}
```

### Listado de áreas enriquecido

`GET /api/v1/master/areas` ahora devuelve por cada área:

```json
{
  "id": "...",
  "management_id": "...",
  "management_name": "Tecnología",
  "name": "Desarrollo",
  "status": "active",
  "responsible_team_member_id": "...",
  "responsible_name": "Juan Pérez",
  "created_at": "...",
  "updated_at": "..."
}
```

Esto permite mostrar directamente el nombre de la gerencia y del responsable en tablas sin hacer peticiones adicionales.

---

## 7. Equipos (`/api/v1/teams`)

### Crear miembro del equipo

```http
POST /api/v1/teams
```

```json
{
  "first_name": "Ana",
  "last_name": "García",
  "email": "ana@miempresa.com",
  "document_type": "DNI",
  "document_number": "12345678",
  "position": "Desarrolladora",
  "management_id": "...",
  "area_id": "...",
  "create_account": true,
  "hire_date": "2026-07-17"
}
```

### Asignar responsable

```http
POST /api/v1/teams/{id}/assign-responsible
```

```json
{
  "management_id": "...",
  "area_id": "..."
}
```

Asigna al miembro del equipo como responsable de una gerencia y/o área.

---

## 8. Documentos y Archivos

El object store usa MinIO. Los archivos se organizan por tenant y miembro del equipo.

### Crear carpeta

```http
POST /api/v1/teams/{team_id}/folders
```

```json
{
  "name": "Contratos",
  "parent_id": null
}
```

### Listar contenido de carpeta

```http
GET /api/v1/teams/{team_id}/folders/{folder_id}
```

### Subir archivo

```http
POST /api/v1/teams/{team_id}/files
Content-Type: multipart/form-data
```

Campos:

- `file`: archivo binario (obligatorio)
- `folder_id`: UUID (opcional)

### Obtener archivo

```http
GET /api/v1/teams/{team_id}/files/{file_id}
```

Devuelve metadatos y URL de descarga.

---

## 9. Swagger UI

Disponible en:

```
http://localhost:8080/docs
```

Haz clic en **Authorize** y escribe:

```
Bearer eyJ...
```

---

## 10. Checklist de integración para el frontend

- [ ] Actualizar la base URL a `/api/v1`.
- [ ] En login, enviar `X-Tenant-Slug` (o `X-Tenant-Id`).
- [ ] Leer `data.token_pair.access_token` y `data.user` de la respuesta de login.
- [ ] Guardar `tenant_id` y usarlo en `X-Tenant-Id` de todas las peticiones protegidas.
- [ ] Implementar refresh token antes de que expire el access token (15 minutos).
- [ ] En tablas de áreas, mostrar `management_name` y `responsible_name` directamente.
- [ ] Para subida de archivos usar `multipart/form-data` con campo `file`.
- [ ] Usar Swagger UI para explorar y probar endpoints.

---

## 11. Documentación completa

Para más detalles ver:

- `docs/integration-guide.md`
- `docs/openapi.yaml`
