import {
  afterNextRender,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  model,
  output,
  viewChild,
} from '@angular/core';
import type { FormCheckboxControl, FormValueControl } from '@angular/forms/signals';

/**
 * Wrapper Angular para `<fluent-text-input>` compatible con `[formField]` de Signal Forms.
 * Implementa el contrato {@link FormValueControl} exponiendo `value` como model signal
 * y emitiendo `touch` en blur.
 */
@Component({
  selector: 'app-fluent-text-input',
  standalone: true,
  imports: [],
  template: `
    <fluent-text-input
      [value]="value()"
      (input)="value.set($any($event.target).value)"
      (blur)="touch.emit()"
      [attr.id]="id()"
      [attr.type]="type()"
      [attr.placeholder]="placeholder()"
    />
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class FluentTextInput implements FormValueControl<string> {
  readonly value = model.required<string>();
  readonly touch = output<void>();

  readonly id = model<string | undefined>(undefined);
  readonly type = model<string>('text');
  readonly placeholder = model<string | undefined>(undefined);
}

/**
 * Wrapper Angular para `<fluent-dropdown>` compatible con `[formField]` de Signal Forms.
 *
 * El valor se sincroniza programáticamente para evitar un error de timing de Fluent UI v3,
 * donde asignar la propiedad `value` antes de que las opciones estén proyectadas produce
 * `Cannot read properties of undefined (reading 'selectOption')`.
 */
@Component({
  selector: 'app-fluent-dropdown',
  standalone: true,
  imports: [],
  template: `
    <fluent-dropdown
      #dropdown
      (change)="onChange($event)"
      (blur)="touch.emit()"
      [attr.placeholder]="placeholder()"
    >
      <fluent-listbox>
        <ng-content />
      </fluent-listbox>
    </fluent-dropdown>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class FluentDropdown implements FormValueControl<string> {
  readonly value = model.required<string>();
  readonly touch = output<void>();

  readonly placeholder = model<string | undefined>(undefined);

  private readonly dropdownRef = viewChild.required<ElementRef<HTMLElement>>('dropdown');

  constructor() {
    afterNextRender(() => {
      const dropdown = this.getDropdown();
      if (!dropdown) {
        return;
      }

      // Sync initial value once the listbox has processed the slotted options.
      this.syncValue(dropdown);

      // Re-sync if options change (e.g. dynamic lists).
      dropdown.addEventListener('slotchange', () => this.syncValue(dropdown));
    });

    effect(() => {
      const dropdown = this.getDropdown();
      if (dropdown) {
        this.syncValue(dropdown);
      }
    });
  }

  private getDropdown(): HTMLElement & { value?: string } | null {
    return this.dropdownRef()?.nativeElement ?? null;
  }

  private syncValue(dropdown: HTMLElement & { value?: string }): void {
    const next = this.value();
    if (next && dropdown.value !== next) {
      try {
        dropdown.value = next;
      } catch {
        // Dropdown may not be ready yet; it will be retried on slotchange.
      }
    }
  }

  protected onChange(event: Event): void {
    const dropdown = event.target as HTMLElement & { value?: string };
    this.value.set(dropdown.value ?? '');
  }
}

/**
 * Wrapper Angular para `<fluent-checkbox>` compatible con `[formField]` de Signal Forms.
 *
 * Nota: en Fluent UI v3 el componente `<fluent-checkbox>` no expone un slot de etiqueta,
 * por lo que el texto se renderiza en un elemento hermano alineado con el control.
 */
@Component({
  selector: 'app-fluent-checkbox',
  standalone: true,
  imports: [],
  template: `
    <label class="app-fluent-checkbox">
      <fluent-checkbox
        [checked]="checked()"
        (change)="checked.set($any($event.target).checked)"
        (blur)="touch.emit()"
      />
      <span class="app-fluent-checkbox__label" (click)="onLabelClick()">
        <ng-content />
      </span>
    </label>
  `,
  styles: `
    .app-fluent-checkbox {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }

    .app-fluent-checkbox__label {
      font-size: 14px;
      font-weight: 400;
      color: var(--neutral-color-800);
      line-height: 1.4;
    }
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class FluentCheckbox implements FormCheckboxControl {
  readonly checked = model.required<boolean>();
  readonly touch = output<void>();

  protected onLabelClick(): void {
    this.checked.set(!this.checked());
  }
}
