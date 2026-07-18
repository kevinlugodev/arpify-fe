import { Component, CUSTOM_ELEMENTS_SCHEMA, input, model, ViewEncapsulation } from '@angular/core';

/**
 * Campo de búsqueda con icono de lupa.
 * Envuelve un <fluent-text-input> y expone el valor como model signal.
 */
@Component({
  selector: 'app-search-field',
  standalone: true,
  imports: [],
  templateUrl: './search-field.html',
  styleUrl: './search-field.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class SearchField {
  /** Placeholder del input. */
  readonly placeholder = input<string>('Buscar...');

  /** Valor actual del campo. */
  readonly value = model<string>('');

  protected onInput(event: Event): void {
    const newValue = (event.target as HTMLInputElement).value;
    this.value.set(newValue);
  }
}
