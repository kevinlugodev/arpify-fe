**Angular Signal Forms** introduce un modelo de formularios 100% reactivo, fuertemente tipado y nativamente integrado con el ecosistema de _Signals_. Esta API optimiza el rendimiento mediante actualizaciones atómicas en el DOM y elimina la dependencia de RxJS para la gestión de estados simples de UI.

---

## 1. Conceptos Clave y Arquitectura

- **Single Source of Truth (Fuente única de verdad):** El estado del formulario no reside en una clase oculta del framework (`FormGroup`), sino en un `signal()` convencional de tu componente.
- **FieldTree (`form()`):** Función de inicialización que envuelve tu signal de datos y genera una estructura de campos tipada que expone metadatos reactivos (`invalid`, `dirty`, `touched`, `errors`).
- **Actualizaciones Atómicas:** Cada propiedad de un campo es un Signal independiente. Angular detecta cambios y ejecuta validaciones de forma dirigida, minimizando los ciclos de detección de cambios (_Change Detection_).

---

## 2. Configuración y Uso Básico

Para comenzar a utilizar Signal Forms, importa los puntos de entrada específicos desde `@angular/forms/signals`.

### Componente (TypeScript)

```typescript
import { Component, signal } from '@angular/core';
import { form, FormField, required, email, debounce } from '@angular/forms/signals';

interface UserFormModel {
  username: string;
  email: string;
}

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [FormField], // Directiva nativa para vinculación con la UI
  templateUrl: './user-form.component.html',
})
export class UserFormComponent {
  // 1. Definición del modelo de datos base
  userModel = signal<UserFormModel>({
    username: '',
    email: '',
  });

  // 2. Creación del FieldTree y definición del esquema
  userForm = form(this.userModel, (schema) => {
    required(schema.username, { message: 'El nombre de usuario es obligatorio.' });

    required(schema.email, { message: 'El correo electrónico es requerido.' });
    email(schema.email, { message: 'El formato de correo no es válido.' });

    // Control de tiempo reactivo por campo
    debounce(schema.email, 400);
  });

  onSubmit() {
    // Evaluación del estado global del formulario
    if (this.userForm.invalid()) {
      return;
    }

    // Los datos en userModel() ya se encuentran sincronizados automáticamente
    console.log('Datos procesados con éxito:', this.userModel());
  }
}
```

### Plantilla (HTML)

Utiliza la propiedad `[formField]` empleando la notación de puntos (_dot notation_) validada por el compilador de TypeScript.

```html
<form (ngSubmit)="onSubmit()">
  <div>
    <label for="username">Usuario:</label>
    <input id="username" type="text" [formField]="userForm.username" />

    @if (userForm.username.invalid() && userForm.username.touched()) {
    <p class="error-msg">{{ userForm.username.getError('required') }}</p>
    }
  </div>

  <div>
    <label for="email">Correo Electrónico:</label>
    <input id="email" type="email" [formField]="userForm.email" />

    @if (userForm.email.invalid() && userForm.email.dirty()) {
    <p class="error-msg">
      {{ userForm.email.getError('email') || userForm.email.getError('required') }}
    </p>
    }
  </div>

  <button type="submit" [disabled]="userForm.invalid()">Registrar</button>
</form>
```

---

## 3. Gestión de Validaciones (Validators)

Las validaciones se ejecutan mediante funciones aplicadas directamente sobre los nodos del `schema` dentro del callback de configuración de `form()`.

### Validadores Nativos Disponibles

| Validador  | Propósito               | Ejemplo de Sintaxis                          |
| :--------- | :---------------------- | :------------------------------------------- |
| `required` | Campo obligatorio       | `required(schema.campo)`                     |
| `email`    | Formato de email válido | `email(schema.email)`                        |
| `min`      | Valor numérico mínimo   | `min(schema.edad, 18)`                       |
| `max`      | Valor numérico máximo   | `max(schema.edad, 99)`                       |
| `pattern`  | Validación por RegEx    | `pattern(schema.codigo, /^[A-Z]{3}-\d{4}$/)` |

### Parámetros de Configuración

Todos los validadores nativos aceptan un objeto de configuración opcional para definir mensajes de error directos:

```typescript
pattern(schema.sku, /^[A-Z]{2}-\d{2}$/, {
  message: 'El formato correcto es AA-12',
});
```

### Validadores Personalizados (Custom Validators)

Se utiliza la función `customValidator` para implementar lógica de negocio específica. La función callback recibe el control del campo (el cual expone un Signal con su valor actual) y debe retornar un objeto de error o `null`.

```typescript
import { customValidator } from '@angular/forms/signals';

// Dentro de la declaración de tu form():
customValidator(
  schema.username,
  (control) => {
    const value = control.value();
    const isInvalid = value.toLowerCase() === 'admin';

    return isInvalid ? { restrictedName: true } : null;
  },
  { message: 'El término "admin" está reservado por el sistema.' },
);
```

---

## 4. Control de Estados del Formulario y Campos

Tanto el contenedor principal (`userForm`) como cada uno de sus campos individuales exponen propiedades reactivas en forma de **Signals**.

### Estados de Ciclo de Vida y Validez

- **`invalid()`**: `WritableSignal<boolean>`. Retorna `true` si el campo o formulario no cumple con alguna regla de validación.
- **`valid()`**: `WritableSignal<boolean>`. Inverso de `invalid()`.
- **`touched()`**: `WritableSignal<boolean>`. Indica si el usuario hizo foco (`focus`) y salió (`blur`) del elemento de la UI.
- **`untouched()`**: `WritableSignal<boolean>`. Inverso de `touched()`.
- **`dirty()`**: `WritableSignal<boolean>`. Indica si el valor original del input ha sido modificado por el usuario.
- **`pristine()`**: `WritableSignal<boolean>`. Inverso de `dirty()`.

### Extracción de Errores en la Vista

1.  **`errors()`**: Devuelve un objeto llave-valor con los errores activos (ej. `{ required: true, pattern: { requiredPattern: '...', actualValue: '...' } }`).
2.  **`getError(key)`**: Método utilitario que resuelve el string asignado en la propiedad `message` del validador para la llave solicitada.

---

## 5. Beneficios y Limitaciones Técnico-Estructurales

### Beneficios

- **Type-Safety Nativo:** Desaparece el uso de llaves basadas en strings como `this.form.get('controlName')`. Todo acceso es tipado estáticamente en tiempo de compilación.
- **Rendimiento Mejorado:** Al estar acoplado a la granularidad fina de Signals, evita ejecuciones innecesarias de validaciones globales o re-renders completos del árbol de componentes.
- **Reducción de Boilerplate:** No se requiere inyectar ni instanciar fábricas de utilidades (`FormBuilder`).

### Desventajas / Consideraciones

- **Migración de Streams Complejos:** Casos de uso avanzados que hacían uso extensivo de operadores de RxJS (como `switchMap`, `pairwise`, o `combineLatest` encadenados a `valueChanges`) requieren una reestructuración mental hacia `computed()` y `effect()`.
- **Convivencia en Proyectos Heredados:** El uso simultáneo de `ReactiveForms` y `SignalForms` dentro de una misma base de código puede fragmentar los patrones de desarrollo si no se delimitan claramente los criterios de adopción.
