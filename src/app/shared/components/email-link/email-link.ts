import { Component, input, ViewEncapsulation } from '@angular/core';

/**
 * Enlace mailto: para direcciones de correo mostradas en tablas.
 */
@Component({
  selector: 'app-email-link',
  standalone: true,
  template: `
    @if (email()) {
      <a class="app-email-link" href="mailto:{{ email() }}">
        <i class="bi bi-envelope"></i>
        {{ email() }}
      </a>
    } @else {
      <span class="app-email-link--empty">-</span>
    }
  `,
  styleUrl: './email-link.scss',
  encapsulation: ViewEncapsulation.None,
})
export class EmailLink {
  readonly email = input.required<string>();
}
