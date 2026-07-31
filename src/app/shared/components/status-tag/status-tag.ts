import { Component, input, ViewEncapsulation } from '@angular/core';

export type StatusDomain =
  | 'team'
  | 'finance-period'
  | 'mass-email'
  | 'master-data'
  | 'clients'
  | 'treasury-payable'
  | 'treasury-payable-document'
  | 'treasury-transaction-type'
  | 'treasury-transaction-category'
  | 'treasury-reconciliation'
  | 'active-state'
  | 'generic';

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
  'treasury-payable': {
    PENDING: { label: 'Pendiente', color: 'yellow', icon: 'bi-hourglass' },
    PARTIALLY_PAID: { label: 'Pago parcial', color: 'blue', icon: 'bi-cash-stack' },
    PAID: { label: 'Pagado', color: 'green', icon: 'bi-check-circle' },
    CANCELLED: { label: 'Anulado', color: 'gray', icon: 'bi-x-circle' },
  },
  'treasury-payable-document': {
    RHE: { label: 'RHE', color: 'purple', icon: 'bi-file-earmark-text' },
    INVOICE: { label: 'Factura', color: 'blue', icon: 'bi-file-earmark' },
    TAX_SETTLEMENT: { label: 'Liquidación tributaria', color: 'yellow', icon: 'bi-calculator' },
  },
  'treasury-transaction-type': {
    INFLOW: { label: 'Ingreso', color: 'green', icon: 'bi-arrow-down-left' },
    OUTFLOW: { label: 'Egreso', color: 'red', icon: 'bi-arrow-up-right' },
    TRANSFER: { label: 'Transferencia', color: 'blue', icon: 'bi-arrow-left-right' },
  },
  'treasury-transaction-category': {
    CUSTOMER_PAYMENT: { label: 'Cobro cliente', color: 'green', icon: 'bi-person-check' },
    SUPPLIER_PAYMENT: { label: 'Pago proveedor', color: 'red', icon: 'bi-truck' },
    RHE_PAYMENT: { label: 'Pago RHE', color: 'purple', icon: 'bi-file-earmark-text' },
    TAX_PAYMENT: { label: 'Impuestos', color: 'yellow', icon: 'bi-calculator' },
    PAYROLL: { label: 'Planilla', color: 'blue', icon: 'bi-people' },
    PARTNER_DRAW: { label: 'Retiro socio', color: 'yellow', icon: 'bi-person' },
    BANK_FEE: { label: 'Comisión bancaria', color: 'gray', icon: 'bi-bank' },
    INTERNAL_TRANSFER: { label: 'Transferencia interna', color: 'blue', icon: 'bi-arrow-left-right' },
    OTHER: { label: 'Otro', color: 'gray', icon: 'bi-three-dots' },
  },
  'treasury-reconciliation': {
    UNRECONCILED: { label: 'Sin conciliar', color: 'gray', icon: 'bi-question-circle' },
    MATCHED: { label: 'Conciliado', color: 'green', icon: 'bi-check-circle' },
    DISCREPANCY: { label: 'Discrepancia', color: 'red', icon: 'bi-exclamation-triangle' },
  },
  'active-state': {
    true: { label: 'Activa', color: 'green', icon: 'bi-check-circle' },
    false: { label: 'Inactiva', color: 'gray', icon: 'bi-pause-circle' },
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
