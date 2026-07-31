import {
  afterNextRender,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewEncapsulation,
  viewChild,
} from '@angular/core';

const WELCOME_SEEN_KEY = 'arpify_welcome_seen';

/**
 * Modal de bienvenida que se muestra una sola vez tras iniciar sesión.
 * Usa localStorage para recordar si el usuario ya lo cerró.
 */
@Component({
  selector: 'app-welcome-modal',
  standalone: true,
  templateUrl: './welcome-modal.html',
  styleUrl: './welcome-modal.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class WelcomeModal {
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => {
      if (typeof localStorage === 'undefined') {
        return;
      }
      if (localStorage.getItem(WELCOME_SEEN_KEY) !== 'true') {
        this.open();
      }
    });
  }

  open(): void {
    this.dialogRef().nativeElement.showModal();
  }

  close(): void {
    this.dialogRef().nativeElement.close();
  }

  protected onAccept(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(WELCOME_SEEN_KEY, 'true');
    }
    this.close();
  }
}
