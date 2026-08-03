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

interface SignUpFormModel {
  email: string;
  password: string;
  companyName: string;
}

const EMPTY_FORM: SignUpFormModel = {
  email: '',
  password: '',
  companyName: '',
};

@Component({
  selector: 'app-sign-up',
  imports: [RouterLink, InfoTip, FormField, FluentTextInput],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class SignUp {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly signUpModel = signal<SignUpFormModel>({ ...EMPTY_FORM });

  protected readonly signUpForm = form(this.signUpModel, (schema) => {
    required(schema.email, { message: 'El correo es obligatorio.' });
    required(schema.password, { message: 'La contraseña es obligatoria.' });
    required(schema.companyName, { message: 'El nombre de la empresa es obligatorio.' });
  });

  protected readonly loading = computed(() => this.authStore.status().loading);

  protected async onSubmit(): Promise<void> {
    this.signUpForm().markAsTouched();

    if (this.signUpForm().invalid()) {
      toast.error('Completa todos los campos');
      return;
    }

    const model = this.signUpModel();

    if (model.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (model.companyName.trim().length < 2) {
      toast.error('El nombre de la empresa debe tener al menos 2 caracteres');
      return;
    }

    try {
      await this.authStore.signUp({
        email: model.email.trim(),
        password: model.password,
        company_name: model.companyName.trim(),
      });
      toast.success('Cuenta creada. Bienvenido a Arpify');
      await this.router.navigate(['/']);
    } catch {
      toast.error(this.authStore.status().error ?? 'Error al crear la cuenta');
    }
  }
}
