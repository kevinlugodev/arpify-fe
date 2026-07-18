import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, signal, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import { FluentTextInput } from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import { AuthStore } from '../../store/auth.store';

type RecoverStep = 'email' | 'code' | 'reset';

interface RecoverPasswordModel {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-recover-password',
  imports: [RouterLink, FormField, FluentTextInput],
  templateUrl: './recover-password.html',
  styleUrl: './recover-password.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class RecoverPassword {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly step = signal<RecoverStep>('email');

  protected readonly model = signal<RecoverPasswordModel>({
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  });

  protected readonly recoverForm = form(this.model, (schema) => {
    required(schema.email, { message: 'El correo es obligatorio.' });
    required(schema.code, { message: 'El código es obligatorio.' });
    required(schema.newPassword, { message: 'La contraseña es obligatoria.' });
    required(schema.confirmPassword, { message: 'Confirma la contraseña.' });
  });

  /** Indica si el store está procesando una operación. */
  protected readonly loading = computed(() => this.authStore.status().loading);

  protected async onSendCode(): Promise<void> {
    this.recoverForm.email().markAsTouched();

    if (this.recoverForm.email().invalid()) {
      toast.error('Ingresa tu correo');
      return;
    }

    try {
      await this.authStore.recoverPassword({ email: this.model().email });
      toast.success('Código enviado a tu correo');
      this.step.set('code');
    } catch {
      toast.error(this.authStore.status().error ?? 'Error al enviar código');
    }
  }

  protected async onVerifyCode(): Promise<void> {
    this.recoverForm.code().markAsTouched();

    if (this.recoverForm.code().invalid()) {
      toast.error('Ingresa el código');
      return;
    }

    try {
      await this.authStore.verifyCode({ email: this.model().email, code: this.model().code });
      toast.success('Código verificado');
      this.step.set('reset');
    } catch {
      toast.error(this.authStore.status().error ?? 'Código inválido');
    }
  }

  protected async onResetPassword(): Promise<void> {
    this.recoverForm.newPassword().markAsTouched();
    this.recoverForm.confirmPassword().markAsTouched();

    if (this.recoverForm.newPassword().invalid() || this.recoverForm.confirmPassword().invalid()) {
      return;
    }

    if (this.model().newPassword !== this.model().confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    try {
      await this.authStore.resetPassword({
        email: this.model().email,
        code: this.model().code,
        new_password: this.model().newPassword,
      });
      toast.success('Contraseña actualizada');
      await this.router.navigate(['/signin']);
    } catch {
      toast.error(this.authStore.status().error ?? 'Error al restablecer');
    }
  }
}
