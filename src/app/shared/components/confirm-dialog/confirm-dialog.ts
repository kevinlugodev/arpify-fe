import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, input, output, viewChild, ViewEncapsulation } from '@angular/core';

/**
 * Diálogo de confirmación modal reutilizable basado en el elemento nativo `<dialog>`.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ConfirmDialog {
  readonly title = input<string>('Confirmar');
  readonly message = input<string>('¿Estás seguro de que deseas continuar?');
  readonly confirmLabel = input<string>('Confirmar');
  readonly cancelLabel = input<string>('Cancelar');
  readonly confirmAppearance = input<'accent' | 'danger'>('accent');

  readonly confirm = output<void>();
  readonly cancel = output<void>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(): void {
    this.dialogRef().nativeElement.showModal();
  }

  close(): void {
    this.dialogRef().nativeElement.close();
  }

  protected onConfirm(): void {
    this.close();
    this.confirm.emit();
  }

  protected onCancel(): void {
    this.close();
    this.cancel.emit();
  }
}
