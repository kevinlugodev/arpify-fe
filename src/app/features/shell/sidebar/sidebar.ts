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
    { label: 'Finanzas', route: '/finance', icon: 'bi-bank' },
    { label: 'Tesorería', route: '/treasury', icon: 'bi-cash-stack' },
    { label: 'Clientes', route: '/clients', icon: 'bi-building' },
    { label: 'Centros de costo', route: '/cost-centers', icon: 'bi-pie-chart' },
    { label: 'Crédito y cobranza', route: '/credit-control', icon: 'bi-credit-card' },
    { label: 'Rendiciones', route: '/expense-claims', icon: 'bi-receipt' },
    { label: 'Activos fijos', route: '/fixed-assets', icon: 'bi-laptop' },
    { label: 'Planillas', route: '/hr-payroll', icon: 'bi-file-earmark-text' },
    { label: 'Socios', route: '/partner-equity', icon: 'bi-person-lines-fill' },
    { label: 'Mi cuenta', route: '/me', icon: 'bi-person' },
  ];
}
