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
  | 'treasury-service-order'
  | 'treasury-petty-cash-state'
  | 'active-state'
  | 'cost-center'
  | 'credit-schedule-status'
  | 'credit-channel'
  | 'expense-claim-status'
  | 'expense-claim-document'
  | 'expense-claim-category'
  | 'asset-status'
  | 'asset-category'
  | 'payroll-status'
  | 'payroll-payment-status'
  | 'partner-draw-type'
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
  'treasury-service-order': {
    DRAFT: { label: 'Borrador', color: 'gray', icon: 'bi-pencil' },
    APPROVED: { label: 'Aprobada', color: 'blue', icon: 'bi-check-circle' },
    IN_PROGRESS: { label: 'En progreso', color: 'yellow', icon: 'bi-hourglass-split' },
    COMPLETED: { label: 'Completada', color: 'green', icon: 'bi-check-circle-fill' },
    CANCELLED: { label: 'Cancelada', color: 'red', icon: 'bi-x-circle' },
  },
  'treasury-petty-cash-state': {
    true: { label: 'Activo', color: 'green', icon: 'bi-check-circle' },
    false: { label: 'Inactivo', color: 'gray', icon: 'bi-pause-circle' },
  },
  'active-state': {
    true: { label: 'Activa', color: 'green', icon: 'bi-check-circle' },
    false: { label: 'Inactiva', color: 'gray', icon: 'bi-pause-circle' },
  },
  'cost-center': {
    active: { label: 'Activo', color: 'green', icon: 'bi-check-circle' },
    inactive: { label: 'Inactivo', color: 'gray', icon: 'bi-pause-circle' },
  },
  'credit-schedule-status': {
    PENDING: { label: 'Pendiente', color: 'yellow', icon: 'bi-hourglass' },
    PARTIALLY_PAID: { label: 'Pago parcial', color: 'blue', icon: 'bi-cash-stack' },
    PAID_ON_TIME: { label: 'Pagado a tiempo', color: 'green', icon: 'bi-check-circle' },
    PAID_LATE: { label: 'Pagado con retraso', color: 'purple', icon: 'bi-clock-history' },
    DEFAULTED: { label: 'Incobrable', color: 'red', icon: 'bi-exclamation-triangle' },
  },
  'credit-channel': {
    EMAIL: { label: 'Correo', color: 'blue', icon: 'bi-envelope' },
    PHONE: { label: 'Teléfono', color: 'green', icon: 'bi-telephone' },
    WHATSAPP: { label: 'WhatsApp', color: 'green', icon: 'bi-whatsapp' },
  },
  'expense-claim-status': {
    DRAFT: { label: 'Borrador', color: 'gray', icon: 'bi-pencil' },
    SUBMITTED: { label: 'Enviada', color: 'blue', icon: 'bi-send' },
    APPROVED: { label: 'Aprobada', color: 'green', icon: 'bi-check-circle' },
    SETTLED: { label: 'Liquidada', color: 'purple', icon: 'bi-file-earmark-check' },
    REJECTED: { label: 'Rechazada', color: 'red', icon: 'bi-x-circle' },
  },
  'expense-claim-document': {
    INVOICE: { label: 'Factura', color: 'blue', icon: 'bi-file-earmark' },
    BOLETA: { label: 'Boleta', color: 'purple', icon: 'bi-file-earmark-text' },
    RECEIPT: { label: 'Recibo', color: 'green', icon: 'bi-receipt' },
    TICKET: { label: 'Ticket', color: 'gray', icon: 'bi-ticket' },
  },
  'expense-claim-category': {
    TRAVEL: { label: 'Viaje', color: 'blue', icon: 'bi-airplane' },
    MEALS: { label: 'Alimentación', color: 'green', icon: 'bi-cup-hot' },
    SUPPLIES: { label: 'Suministros', color: 'yellow', icon: 'bi-box-seam' },
    TRANSPORT: { label: 'Transporte', color: 'purple', icon: 'bi-car-front' },
    OTHER: { label: 'Otro', color: 'gray', icon: 'bi-three-dots' },
  },
  'asset-status': {
    ACTIVE: { label: 'Activo', color: 'green', icon: 'bi-check-circle' },
    FULLY_DEPRECIATED: { label: 'Depreciado', color: 'gray', icon: 'bi-battery-full' },
    DISPOSED: { label: 'Dado de baja', color: 'red', icon: 'bi-x-circle' },
  },
  'asset-category': {
    IT_EQUIPMENT: { label: 'Equipos TI', color: 'blue', icon: 'bi-laptop' },
    FURNITURE: { label: 'Muebles', color: 'yellow', icon: 'bi-lamp' },
    VEHICLES: { label: 'Vehículos', color: 'purple', icon: 'bi-car-front' },
    MACHINERY: { label: 'Maquinaria', color: 'green', icon: 'bi-gear' },
    OTHER: { label: 'Otro', color: 'gray', icon: 'bi-three-dots' },
  },
  'payroll-status': {
    DRAFT: { label: 'Borrador', color: 'gray', icon: 'bi-pencil' },
    APPROVED: { label: 'Aprobada', color: 'blue', icon: 'bi-check-circle' },
    PAID: { label: 'Pagada', color: 'green', icon: 'bi-check-circle-fill' },
    CANCELLED: { label: 'Cancelada', color: 'red', icon: 'bi-x-circle' },
  },
  'payroll-payment-status': {
    PENDING: { label: 'Pendiente', color: 'yellow', icon: 'bi-hourglass' },
    PAID: { label: 'Pagado', color: 'green', icon: 'bi-check-circle' },
  },
  'partner-draw-type': {
    EARNED_DISTRIBUTION: { label: 'Utilidad ganada', color: 'green', icon: 'bi-graph-up-arrow' },
    ADVANCE_DRAW: { label: 'Adelanto', color: 'yellow', icon: 'bi-cash' },
    SETTLEMENT_PAYMENT: { label: 'Liquidación RHE', color: 'blue', icon: 'bi-file-earmark-text' },
  },
};

/**
 * Tag visual para representar estados con un label legible y color corporativo.
 */
@Component({
  selector: 'app-status-tag',
  standalone: true,
  template: `
    <span
      class="app-status-tag app-status-tag--{{ config().color }}"
      [attr.title]="title() || null"
    >
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
  readonly title = input<string | undefined>(undefined);

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
