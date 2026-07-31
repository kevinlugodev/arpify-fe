import {
  afterNextRender,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  effect,
  ElementRef,
  inject,
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
      (input)="onInput($event)"
      (blur)="touch.emit()"
      [attr.id]="id()"
      [attr.type]="type()"
      [attr.inputmode]="inputmode()"
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
  readonly inputmode = model<string | undefined>(undefined);
  readonly placeholder = model<string | undefined>(undefined);
  readonly decimals = model<number | undefined>(undefined);

  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const maxDecimals = this.decimals();
    let next = input.value;

    if (maxDecimals !== undefined && maxDecimals >= 0) {
      next = this.sanitizeDecimal(next, maxDecimals);
      if (input.value !== next) {
        input.value = next;
      }
    }

    this.value.set(next);
  }

  private sanitizeDecimal(value: string, maxDecimals: number): string {
    let cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');

    if (parts.length > 2) {
      cleaned = `${parts[0]}.${parts.slice(1).join('')}`;
    }

    if (parts.length === 2) {
      const integerPart = parts[0];
      const decimalPart = parts[1].slice(0, maxDecimals);
      cleaned = decimalPart.length > 0 ? `${integerPart}.${decimalPart}` : integerPart + '.';
    }

    return cleaned;
  }
}

type DropdownElement = HTMLElement & {
  value?: string | null;
  listbox?: HTMLElement;
  options?: { value: string }[];
  control?: { value?: string };
};

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
  private readonly destroyRef = inject(DestroyRef);
  private dropdownObserver?: MutationObserver;

  constructor() {
    afterNextRender(() => {
      const dropdown = this.getDropdown();
      if (!dropdown) {
        return;
      }

      const sync = () => this.syncValue(dropdown);

      // Sync initial value once the listbox has processed the slotted options.
      sync();

      // Re-sync if the slotted listbox changes (e.g. when it is first assigned).
      dropdown.addEventListener('slotchange', () => {
        sync();
        this.observeDropdown(dropdown);
      });

      // Re-sync when the listbox options change (e.g. async loading via @for).
      this.observeDropdown(dropdown);

      // Retry a few frames in case options/projections are still pending.
      let attempts = 0;
      const retry = () => {
        if (attempts++ >= 10) {
          return;
        }
        sync();
        const next = this.value();
        if (next && !this.hasOption(dropdown, next)) {
          requestAnimationFrame(retry);
        }
      };
      requestAnimationFrame(retry);
    });

    effect(() => {
      const dropdown = this.getDropdown();
      if (dropdown) {
        this.syncValue(dropdown);
      }
    });
  }

  private getDropdown(): DropdownElement | null {
    return this.dropdownRef()?.nativeElement ?? null;
  }

  private observeDropdown(dropdown: DropdownElement): void {
    if (this.dropdownObserver) {
      return;
    }

    this.dropdownObserver = new MutationObserver(() => this.syncValue(dropdown));
    this.dropdownObserver.observe(dropdown, { childList: true, subtree: true });
    this.destroyRef.onDestroy(() => this.dropdownObserver?.disconnect());
  }

  private hasAnyOption(dropdown: DropdownElement): boolean {
    const options = dropdown.options ?? [];
    if (options.length > 0) {
      return true;
    }
    // Fallback when the custom element registry is not yet ready.
    return dropdown.querySelectorAll('fluent-option').length > 0;
  }

  private hasOption(dropdown: DropdownElement, value: string): boolean {
    const options = dropdown.options ?? [];
    if (options.length > 0) {
      return options.some((option) => option.value === value);
    }
    // Fallback when the custom element registry is not yet ready.
    return Array.from(dropdown.querySelectorAll('fluent-option')).some((option) => option.getAttribute('value') === value);
  }

  private syncValue(dropdown: DropdownElement): void {
    const next = this.value();

    // Do not touch the value while the listbox or control are not yet assigned;
    // setting it before that point throws inside Fluent UI's selectOption implementation.
    if (!dropdown.listbox || !dropdown.control) {
      return;
    }

    if (!this.hasAnyOption(dropdown)) {
      // Options may not be ready yet; MutationObserver/retry will retry.
      return;
    }

    if (!next) {
      if (dropdown.value !== '') {
        dropdown.value = '';
      }
      return;
    }

    if (!this.hasOption(dropdown, next)) {
      // Options may not be ready yet; MutationObserver/retry will retry.
      return;
    }

    if (dropdown.value !== next) {
      dropdown.value = next;
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
