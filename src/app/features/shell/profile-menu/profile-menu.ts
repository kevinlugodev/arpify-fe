import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';

/**
 * Datos mínimos de perfil requeridos para renderizar el menú de usuario.
 */
export interface ProfileMenuData {
  /** Nombre completo del usuario. */
  name: string;
  /** Correo electrónico del usuario. */
  email: string;
  /** Iniciales mostradas en el avatar. */
  initials: string;
}

/**
 * Menú de perfil de usuario estilo OneDrive / Microsoft 365.
 *
 * Renderiza un disparador con avatar + texto en el header oscuro y un popover
 * light mode que se abre/cierra mediante un signal booleano. Todos los eventos
 * se emiten hacia el componente padre para mantener responsabilidades separadas.
 */
@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [],
  templateUrl: './profile-menu.html',
  styleUrl: './profile-menu.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class ProfileMenu {
  /** Datos del usuario autenticado. */
  readonly profile = input.required<ProfileMenuData>();

  /** Emite cuando el usuario selecciona "Mi Perfil". */
  readonly profileClick = output<void>();

  /** Emite cuando el usuario selecciona "Configuración de Cuenta". */
  readonly accountSettingsClick = output<void>();

  /** Emite cuando el usuario selecciona "Cambiar de Tenant/Workspace". */
  readonly switchWorkspaceClick = output<void>();

  /** Emite cuando el usuario selecciona "Cerrar sesión". */
  readonly signOutClick = output<void>();

  /** Controla la visibilidad del popover de perfil. */
  protected readonly isProfileMenuOpen = signal(false);

  /**
   * Abre o cierra el menú desplegable.
   * Detiene la propagación para evitar que el clic cierre inmediatamente el menú
   * a través del listener de backdrop.
   */
  protected toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isProfileMenuOpen.update((open) => !open);
  }

  /**
   * Cierra el menú desplegable.
   */
  protected closeMenu(): void {
    this.isProfileMenuOpen.set(false);
  }

  /**
   * Cierra el menú cuando el usuario hace clic fuera del popover.
   */
  protected onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target?.classList?.contains('profile-menu__backdrop')) {
      this.closeMenu();
    }
  }

  /**
   * Emite el evento correspondiente y cierra el menú.
   */
  protected onProfileClick(): void {
    this.profileClick.emit();
    this.closeMenu();
  }

  protected onAccountSettingsClick(): void {
    this.accountSettingsClick.emit();
    this.closeMenu();
  }

  protected onSwitchWorkspaceClick(): void {
    this.switchWorkspaceClick.emit();
    this.closeMenu();
  }

  protected onSignOutClick(): void {
    this.signOutClick.emit();
    this.closeMenu();
  }
}
