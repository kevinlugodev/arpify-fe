import { Component, input, ViewEncapsulation } from '@angular/core';

export type StatusDomain = 'team' | 'finance-period' | 'mass-email' | 'master-data' | 'clients' | 'generic';

interface StatusConfig {
  label: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple';
  icon: string;
}

const STATUS_MAP: Record<StatusDomain, Record<string, StatusConfig>> = {
  generic: {},
  team: {
    active: { label: 'Activo', color: 'green', icon: 'bi-check-circle' },
    inactive: { label: 'Inactivo', color: 'gray', icon: 'bi-pause-circle' },
    on_leave: { label: 'De licencia', color: 'yellow', icon: 'bi-calendar' },
    terminated: { label: 'Terminado', color: 'red', icon: 'bi-x-circle' },
    suspended: { label: 'Suspendido', color: 'red', icon: 'bi-exclamation-circle' },
  },
  'finance-period': {
    draft: { label: 'Borrador', color: 'gray', icon: 'bi-pencil' },
    declared: { label: 'Declarado', color: 'blue', icon: 'bi-file-earmark-check' },
    paid: { label: 'Pagado', color: 'green', icon: 'bi-check-circle' },
    closed: { label: 'Cerrado', color: 'purple', icon: 'bi-lock' },
  },
  'mass-email': {
    pending: { label: 'Pendiente', color: 'yellow', icon: 'bi-hourglass' },
    sent: { label: 'Enviado', color: 'green', icon: 'bi-send-check' },
    failed: { label: 'Fallido', color: 'red', icon: 'bi-x-circle' },
    bounced: { label: 'Rebotado', color: 'red', icon: 'bi-arrow-return-left' },
  },
  'master-data': {
    active: { label: 'Activo', color: 'green', icon: 'bi-check-circle' },
    inactive: { label: 'Inactivo', color: 'gray', icon: 'bi-pause-circle' },
  },
  clients: {
    active: { label: 'Activo', color: 'green', icon: 'bi-check-circle' },
    inactive: { label: 'Inactivo', color: 'gray', icon: 'bi-pause-circle' },
    lead: { label: 'Prospecto', color: 'blue', icon: 'bi-lightbulb' },
    suspended: { label: 'Suspendido', color: 'red', icon: 'bi-exclamation-circle' },
  },
};

/**
 * Tag visual para representar estados con un label legible y color corporativo.
 */
@Component({
  selector: 'app-status-tag',
  standalone: true,
  template: `
    <span class="app-status-tag app-status-tag--{{ config().color }}">
      <i class="bi {{ config().icon }}"></i>
      {{ config().label }}
    </span>
  `,
  styleUrl: './status-tag.scss',
  encapsulation: ViewEncapsulation.None,
})
export class StatusTag {
  readonly status = input.required<string>();
  readonly domain = input.required<StatusDomain>();

  protected config(): StatusConfig {
    const domainMap = STATUS_MAP[this.domain()] ?? {};
    return (
      domainMap[this.status()] ?? {
        label: this.status() || 'Desconocido',
        color: 'gray',
        icon: 'bi-question-circle',
      }
    );
  }
}
