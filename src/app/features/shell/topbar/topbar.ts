import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, OnDestroy, signal, ViewEncapsulation } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthStore } from '../../../features/auth/store/auth.store';
import ProfileMenu, { ProfileMenuData } from '../profile-menu/profile-menu';

const ROUTE_MODULE_LABELS: Record<string, string> = {
  '/': 'Inicio',
  '/teams': 'Equipos',
  '/teams/new': 'Nuevo miembro',
  '/organizacion': 'Estructura organizacional',
  '/mass-emails': 'Correos masivos',
  '/audit': 'Auditoría',
  '/me': 'Mi cuenta',
  '/me/audit-logs': 'Registros de actividad',
};

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
export default class Topbar implements OnDestroy {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly routeSubscription: Subscription;

  protected readonly currentModuleLabel = signal<string>('');

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

  constructor() {
    this.currentModuleLabel.set(this.resolveModuleLabel(this.router.url));
    this.routeSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentModuleLabel.set(this.resolveModuleLabel((event as NavigationEnd).urlAfterRedirects));
      });
  }

  ngOnDestroy(): void {
    this.routeSubscription.unsubscribe();
  }

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

  private resolveModuleLabel(url: string): string {
    const cleanUrl = url.split('?')[0] ?? url;
    if (ROUTE_MODULE_LABELS[cleanUrl]) {
      return ROUTE_MODULE_LABELS[cleanUrl];
    }
    if (cleanUrl.startsWith('/teams/') && cleanUrl.includes('/edit')) {
      return 'Editar miembro';
    }
    if (cleanUrl.startsWith('/teams/')) {
      return 'Detalle del miembro';
    }
    return '';
  }
}
