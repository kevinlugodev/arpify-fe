import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

interface NavGroup {
  label: string;
  icon: string;
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry;
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
  private readonly router = inject(Router);

  private readonly navEntries: NavEntry[] = [
    { label: 'Inicio', route: '/', icon: 'bi-house' },
    {
      label: 'Personas',
      icon: 'bi-people',
      items: [
        { label: 'Equipos', route: '/teams', icon: 'bi-person-vcard' },
        { label: 'Estructura organizacional', route: '/organizacion', icon: 'bi-diagram-3' },
        { label: 'Planillas', route: '/hr-payroll', icon: 'bi-file-earmark-text' },
      ],
    },
    {
      label: 'Comercial',
      icon: 'bi-briefcase',
      items: [
        { label: 'Clientes', route: '/clients', icon: 'bi-building' },
        { label: 'Correos masivos', route: '/mass-emails', icon: 'bi-envelope-paper' },
      ],
    },
    {
      label: 'Financiero',
      icon: 'bi-bank',
      items: [
        { label: 'Finanzas', route: '/finance', icon: 'bi-calculator' },
        { label: 'Tesorería', route: '/treasury', icon: 'bi-cash-stack' },
        { label: 'Centros de costo', route: '/cost-centers', icon: 'bi-pie-chart' },
        { label: 'Crédito y cobranza', route: '/credit-control', icon: 'bi-credit-card' },
        { label: 'Rendiciones', route: '/expense-claims', icon: 'bi-receipt' },
        { label: 'Activos fijos', route: '/fixed-assets', icon: 'bi-laptop' },
        { label: 'Socios', route: '/partner-equity', icon: 'bi-person-lines-fill' },
      ],
    },
    {
      label: 'Sistema',
      icon: 'bi-gear',
      items: [{ label: 'Auditoría', route: '/audit', icon: 'bi-shield-check' }],
    },
    { label: 'Mi cuenta', route: '/me', icon: 'bi-person' },
  ];

  protected readonly entries = signal<NavEntry[]>(this.navEntries);
  protected readonly expandedGroups = signal<Set<string>>(new Set());

  constructor() {
    const initiallyExpanded = new Set<string>();
    for (const entry of this.navEntries) {
      if (isGroup(entry) && entry.items.some((item) => this.isRouteActive(item.route))) {
        initiallyExpanded.add(entry.label);
      }
    }
    this.expandedGroups.set(initiallyExpanded);
  }

  protected isGroup(entry: NavEntry): entry is NavGroup {
    return isGroup(entry);
  }

  protected isExpanded(group: NavGroup): boolean {
    return this.expandedGroups().has(group.label);
  }

  protected toggleGroup(group: NavGroup): void {
    this.expandedGroups.update((set) => {
      const next = new Set(set);
      if (next.has(group.label)) {
        next.delete(group.label);
      } else {
        next.add(group.label);
      }
      return next;
    });
  }

  protected isRouteActive(route: string): boolean {
    const path = this.router.url.split('?')[0];
    if (route === '/') {
      return path === '/';
    }
    return path === route || path.startsWith(`${route}/`);
  }
}
