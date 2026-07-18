import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../../features/auth/store/auth.store';
import ProfileMenu, { ProfileMenuData } from '../profile-menu/profile-menu';

/**
 * Construye un nombre legible a partir del correo cuando el backend
 * aún no expone first_name / last_name en la respuesta de autenticación.
 * Ejemplo: "kevin.luna@acme.com" -> "Kevin Luna".
 */
function buildDisplayName(email: string): string {
  const localPart = email.split('@')[0] ?? email;
  return localPart
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

/**
 * Extrae hasta dos iniciales a partir del nombre mostrado.
 */
function buildInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const second = words[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [ProfileMenu],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class Topbar {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  /** Datos del usuario autenticado. */
  protected readonly store = this.authStore;

  /** Datos de perfil normalizados para el menú de usuario. */
  protected readonly profile = computed<ProfileMenuData>(() => {
    const user = this.authStore.user();
    const email = user?.email ?? 'Usuario';
    const name = user ? buildDisplayName(email) : 'Usuario';
    return {
      name,
      email,
      initials: buildInitials(name),
    };
  });

  protected async onSignOut(): Promise<void> {
    this.authStore.signOut();
    await this.router.navigate(['/signin']);
  }

  protected onProfile(): void {
    void this.router.navigate(['/me']);
  }

  protected onAccountSettings(): void {
    void this.router.navigate(['/me']);
  }

  protected onSwitchWorkspace(): void {
    void this.router.navigate(['/signin']);
  }
}
