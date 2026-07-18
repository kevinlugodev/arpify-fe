import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import { FluentTextInput } from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import { AuthStore } from '../../store/auth.store';

interface SignInFormModel {
  email: string;
  password: string;
  tenantSlug: string;
}

@Component({
  selector: 'app-sign-in',
  imports: [RouterLink, InfoTip, FormField, FluentTextInput],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class SignIn {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly signInModel = signal<SignInFormModel>({
    email: '',
    password: '',
    tenantSlug: '',
  });

  protected readonly signInForm = form(this.signInModel, (schema) => {
    required(schema.email, { message: 'El correo es obligatorio.' });
    required(schema.password, { message: 'La contraseña es obligatoria.' });
  });

  /** Indica si el store está procesando una operación de autenticación. */
  protected readonly loading = computed(() => this.authStore.status().loading);

  protected async onSubmit(): Promise<void> {
    this.signInForm().markAsTouched();

    if (this.signInForm().invalid()) {
      toast.error('Completa todos los campos');
      return;
    }

    this.authStore.setTenantSlug(this.signInModel().tenantSlug);

    try {
      await this.authStore.signIn({
        email: this.signInModel().email,
        password: this.signInModel().password,
      });
      toast.success('Bienvenido');
      await this.router.navigate(['/']);
    } catch {
      toast.error(this.authStore.status().error ?? 'Error al iniciar sesión');
    }
  }
}
