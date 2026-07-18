import { Component, ViewEncapsulation } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  encapsulation: ViewEncapsulation.None,
})
export default class Sidebar {
  protected readonly navItems: NavItem[] = [
    { label: 'Inicio', route: '/', icon: 'bi-house' },
    { label: 'Equipos', route: '/teams', icon: 'bi-people' },
    { label: 'Estructura organizacional', route: '/organizacion', icon: 'bi-diagram-3' },
    { label: 'Correos masivos', route: '/mass-emails', icon: 'bi-envelope-paper' },
    { label: 'Auditoría', route: '/audit', icon: 'bi-shield-check' },
    { label: 'Mi cuenta', route: '/me', icon: 'bi-person' },
  ];
}
