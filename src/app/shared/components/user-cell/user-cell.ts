import { Component, input, ViewEncapsulation } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { EmailLink } from '../email-link/email-link';

/**
 * Celda de usuario con avatar (prefijo/iniciales) y nombre.
 * El correo solo se muestra cuando `showEmail` está activo.
 */
@Component({
  selector: 'app-user-cell',
  standalone: true,
  imports: [Avatar, EmailLink],
  template: `
    @if (name()) {
      <div class="app-user-cell">
        <app-avatar [name]="name()" [prefix]="prefix()" size="sm" />
        <div class="app-user-cell__info">
          <span class="app-user-cell__name">{{ name() }}</span>
          @if (showEmail() && email()) {
            <app-email-link [email]="email()!" />
          }
        </div>
      </div>
    }
  `,
  styleUrl: './user-cell.scss',
  encapsulation: ViewEncapsulation.None,
})
export class UserCell {
  readonly name = input.required<string>();
  readonly email = input<string>();
  readonly prefix = input<string>();
  readonly showEmail = input<boolean>(false);
}
