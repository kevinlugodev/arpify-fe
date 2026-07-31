# APIs de Estado de Equipo y Dashboard — Guía de Integración

## Propósito

Esta guía documenta dos endpoints nuevos:

1. **Actualización de estado de un miembro del equipo**: permite cambiar exclusivamente el estado de un `team_member` sin modificar otros campos.
2. **Métricas del dashboard**: devuelve conteos clave para el panel principal: miembros activos (no terminados), gerencias activas, áreas activas y clientes activos.

---

## 1. Actualizar estado de un miembro del equipo

### Endpoint

| Método | Path | Descripción |
|--------|------|-------------|
| `PATCH` | `/api/v1/teams/{id}/status` | Actualiza únicamente el estado del miembro. |

### Headers requeridos

- `Authorization: Bearer <access_token>`
- `X-Tenant-Id: <tenant_uuid>`
- `Content-Type: application/json`

> Nota: el middleware de tenant requiere `X-Tenant-Id`. `X-Tenant-Slug` no se resuelve automáticamente en la configuración actual.

### Estados válidos

| Valor | Descripción |
|-------|-------------|
| `active` | Activo |
| `inactive` | Inactivo |
| `on_leave` | De licencia |
| `terminated` | Terminado |
| `suspended` | Suspendido |

### Request body

```json
{
  "status": "on_leave"
}
```

### Response 200 OK

```json
{
  "success": true,
  "data": {
    "team_member": {
      "id": "6f30a022-2f5f-442c-b9a7-d782a4c3e578",
      "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5",
      "first_name": "Kevin",
      "last_name": "Lugo",
      "email": "admin@arpadevs.com",
      "status": "on_leave",
      "updated_at": "2026-07-30T22:04:47.143919-05:00"
    }
  },
  "meta": {
    "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5"
  }
}
```

> La respuesta incluye el objeto completo del miembro. En el ejemplo anterior se omitieron campos secundarios por brevedad.

### Códigos de error

| HTTP | Código | Descripción |
|------|--------|-------------|
| 400 | `validation_error` | `status` ausente o no válido. |
| 401 | `unauthorized` | Token ausente, inválido o expirado. |
| 403 | `forbidden` | `X-Tenant-Id` ausente o usuario sin acceso al tenant. |
| 404 | `not_found` | Miembro no existe o fue eliminado. |
| 500 | `internal_server_error` | Error inesperado. |

### Ejemplo de error

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Key: 'UpdateTeamMemberStatusRequest.Status' Error:Field validation for 'Status' failed on the 'oneof' tag"
  },
  "meta": {
    "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5"
  }
}
```

---

## 2. Métricas del dashboard

### Endpoint

| Método | Path | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/dashboard/metrics` | Retorna conteos clave del dashboard. |

### Headers requeridos

- `Authorization: Bearer <access_token>`
- `X-Tenant-Id: <tenant_uuid>`

### Response 200 OK

```json
{
  "success": true,
  "data": {
    "metrics": {
      "team_members_not_terminated_count": 12,
      "active_managements_count": 4,
      "active_areas_count": 3,
      "active_customers_count": 8
    }
  },
  "meta": {
    "tenant_id": "5e535672-21ea-4d75-ac88-391dc57a9af5"
  }
}
```

### Descripción de métricas

| Campo | Fuente | Filtros aplicados |
|-------|--------|-------------------|
| `team_members_not_terminated_count` | `teams.team_members` | `status != 'terminated'` y `deleted_at IS NULL` |
| `active_managements_count` | `master.managements` | `status = 'active'` y `deleted_at IS NULL` |
| `active_areas_count` | `master.areas` | `status = 'active'` y `deleted_at IS NULL` |
| `active_customers_count` | `clients.customers` | `status = 'active'` y `deleted_at IS NULL` |

### Códigos de error

| HTTP | Código | Descripción |
|------|--------|-------------|
| 401 | `unauthorized` | Token ausente, inválido o expirado. |
| 403 | `forbidden` | `X-Tenant-Id` ausente. |
| 500 | `internal_server_error` | Error consultando alguna de las tablas. |

---

## Permisos

- `PATCH /teams/{id}/status`: requiere rol `OWNER`, `ADMIN` o `HR` (mismo grupo de permisos que el resto del módulo `teams`).
- `GET /dashboard/metrics`: disponible para cualquier usuario autenticado del tenant.

---

## Notas para el frontend

- El campo `status` debe enviarse como string con uno de los valores permitidos.
- El endpoint de estado reutiliza la validación y persistencia del update general, por lo que respeta las mismas reglas de negocio.
- Las métricas son de solo lectura y no requieren parámetros adicionales.

---

## Archivos relacionados

- `internal/teams/domain/entity.go`
- `internal/teams/usecase/usecases.go`
- `internal/teams/transport/http_handlers.go`
- `internal/dashboard/repository/repository.go`
- `internal/dashboard/repository/postgres/dashboard_postgres.go`
- `internal/dashboard/usecase/usecases.go`
- `internal/dashboard/transport/http_handlers.go`
- `cmd/arpify-api/main.go`
