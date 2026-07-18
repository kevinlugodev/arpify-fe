import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect, inject, resource, signal, ViewEncapsulation } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import PageHeader from '../../../../shared/components/page-header/page-header';
import { FluentTextInput } from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import { UserProfile } from '../../../../core/models/user.model';
import { MeService } from '../../services/me';
import { MeStore } from '../../store/me.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource } from '../../../../core/utils/resource-helpers';

interface ProfileFormModel {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  photo_url: string | null;
}

interface PasswordFormModel {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const EMPTY_PROFILE: ProfileFormModel = {
  first_name: '',
  last_name: '',
  phone: '',
  address: '',
  photo_url: null,
};

@Component({
  selector: 'app-profile',
  imports: [PageHeader, InfoTip, FormField, FluentTextInput],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class Profile {
  private readonly meService = inject(MeService);
  private readonly meStore = inject(MeStore);

  /** Recurso reactivo que carga el perfil del usuario autenticado. */
  private readonly profileResource = apiResource<UserProfile | null>(async () => {
    try {
      return await toApiPromise(this.meService.getProfile());
    } catch {
      toast.error('Error al cargar el perfil');
      return null;
    }
  });

  protected readonly profileModel = signal<ProfileFormModel>(EMPTY_PROFILE);
  protected readonly profileForm = form(this.profileModel, (schema) => {
    required(schema.first_name, { message: 'El nombre es obligatorio.' });
    required(schema.last_name, { message: 'El apellido es obligatorio.' });
  });

  protected readonly passwordModel = signal<PasswordFormModel>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  protected readonly passwordForm = form(this.passwordModel, (schema) => {
    required(schema.currentPassword, { message: 'Ingresa tu contraseña actual.' });
    required(schema.newPassword, { message: 'Ingresa una nueva contraseña.' });
    required(schema.confirmPassword, { message: 'Confirma la nueva contraseña.' });
  });

  protected readonly saving = signal(false);
  protected readonly changingPassword = signal(false);

  protected readonly loading = computed(() => this.profileResource.isLoading());

  constructor() {
    effect(() => {
      const data = this.profileResource.value();
      if (!data) {
        this.profileModel.set(EMPTY_PROFILE);
        return;
      }
      this.profileModel.set({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        address: data.address,
        photo_url: data.photo_url,
      });
    });
  }

  protected async onSave(): Promise<void> {
    this.profileForm().markAsTouched();

    if (this.profileForm().invalid()) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    this.saving.set(true);
    try {
      await this.meStore.updateProfile({ ...this.profileModel() });
      toast.success('Perfil actualizado');
      this.profileResource.reload();
    } catch {
      toast.error(this.meStore.status().error ?? 'Error al actualizar');
    } finally {
      this.saving.set(false);
    }
  }

  protected async onChangePassword(): Promise<void> {
    this.passwordForm().markAsTouched();

    if (this.passwordForm().invalid()) {
      toast.error('Completa todos los campos');
      return;
    }

    if (this.passwordModel().newPassword !== this.passwordModel().confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    this.changingPassword.set(true);
    try {
      await this.meStore.changePassword({
        current_password: this.passwordModel().currentPassword,
        new_password: this.passwordModel().newPassword,
      });
      toast.success('Contraseña cambiada');
      this.passwordModel.set({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      toast.error(this.meStore.status().error ?? 'Error al cambiar contraseña');
    } finally {
      this.changingPassword.set(false);
    }
  }
}
