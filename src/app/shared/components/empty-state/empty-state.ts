import { Component, CUSTOM_ELEMENTS_SCHEMA, input, output, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class EmptyState {
  readonly icon = input<string>('bi-inbox');
  readonly title = input<string>('No hay datos');
  readonly message = input<string>('Aún no se ha registrado información en esta sección.');
  readonly actionLabel = input<string>();
  readonly actionClick = output<void>();

  protected onActionClick(): void {
    this.actionClick.emit();
  }
}
