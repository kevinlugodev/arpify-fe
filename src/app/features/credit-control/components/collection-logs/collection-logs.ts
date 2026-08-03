import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import DataTable, { DataTableAction, DataTableColumn } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import {
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import {
  CollectionLog,
  ContactChannel,
  CreateCollectionLogRequest,
  CreditAccountSchedule,
  UpdateCollectionLogRequest,
} from '../../../../core/models/credit-control.model';
import { CreditControlService } from '../../services/credit-control';
import { CreditControlStore } from '../../store/credit-control.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

interface Option<T = string> {
  value: T;
  label: string;
}

interface CollectionLogFormModel {
  schedule_id: string;
  contact_date: string;
  contact_channel: ContactChannel | '';
  notes: string;
  next_follow_up_date: string;
}

const CHANNEL_OPTIONS: Option<ContactChannel>[] = [
  { value: 'EMAIL', label: 'Correo electrónico' },
  { value: 'PHONE', label: 'Teléfono' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
];

const EMPTY_LOG: CollectionLogFormModel = {
  schedule_id: '',
  contact_date: new Date().toISOString().split('T')[0],
  contact_channel: '',
  notes: '',
  next_follow_up_date: '',
};

@Component({
  selector: 'app-collection-logs',
  standalone: true,
  imports: [DataTable, EmptyState, ConfirmDialog, FormField, FluentTextInput, FluentDropdown],
  templateUrl: './collection-logs.html',
  styleUrl: './collection-logs.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class CollectionLogsComponent {
  private readonly creditControlService = inject(CreditControlService);
  private readonly creditControlStore = inject(CreditControlStore);

  readonly schedules = input.required<CreditAccountSchedule[]>();
  readonly selectedScheduleId = input<string>('');

  readonly schedulesChanged = output<void>();

  protected readonly model = signal<CollectionLogFormModel>({ ...EMPTY_LOG });
  protected readonly form;

  protected readonly editingLogId = signal<string | null>(null);
  protected readonly itemToDelete = signal<CollectionLog | null>(null);

  private readonly deleteDialog = viewChild<ConfirmDialog>('deleteDialog');

  protected readonly scheduleOptions = computed<Option<string>[]>(() => [
    { value: '', label: 'Selecciona un cronograma' },
    ...this.schedules().map((schedule) => ({
      value: schedule.id,
      label: `${schedule.receivable_id} — ${schedule.invoice_amount - schedule.paid_amount}`,
    })),
  ]);

  protected readonly channelOptions = CHANNEL_OPTIONS;

  private readonly logsResource = apiResourceWithRequest<CollectionLog[], string>(
    () => this.model().schedule_id,
    async ({ params }) => {
      if (!params) {
        return [];
      }
      try {
        const response = await toApiPromise(this.creditControlService.getScheduleLogs(params, { limit: 100 }));
        return response.items;
      } catch {
        toast.error('Error al cargar bitácoras de cobranza');
        return [];
      }
    }
  );

  protected readonly logs = computed<CollectionLog[]>(() => this.logsResource.value() ?? []);
  protected readonly logsLoading = computed(() => this.logsResource.isLoading());
  protected readonly saving = computed(() => this.creditControlStore.status().loading);

  protected readonly columns: DataTableColumn<CollectionLog>[] = [
    { key: 'contact_date', header: 'Fecha de contacto', type: 'date' },
    { key: 'contact_channel', header: 'Canal', type: 'status', statusDomain: 'credit-channel' },
    { key: 'notes', header: 'Notas' },
    { key: 'next_follow_up_date', header: 'Próximo seguimiento', type: 'date' },
  ];

  protected readonly actions: DataTableAction<CollectionLog>[] = [
    { key: 'edit', label: 'Editar', icon: 'bi-pencil' },
    { key: 'delete', label: 'Eliminar', icon: 'bi-trash' },
  ];

  protected readonly isEditing = computed(() => !!this.editingLogId());

  constructor() {
    this.form = form(this.model, (schema) => {
      required(schema.schedule_id, { message: 'Selecciona un cronograma.' });
      required(schema.contact_date, { message: 'La fecha de contacto es obligatoria.' });
      required(schema.contact_channel, { message: 'El canal es obligatorio.' });
      required(schema.notes, { message: 'Las notas son obligatorias.' });
    });

    effect(() => {
      const id = this.selectedScheduleId();
      if (id) {
        this.model.update((model) => ({ ...model, schedule_id: id }));
      }
    });
  }

  protected onScheduleChange(): void {
    this.editingLogId.set(null);
    this.model.update((model) => ({ ...EMPTY_LOG, schedule_id: model.schedule_id }));
  }

  protected async onSubmit(): Promise<void> {
    this.form().markAsTouched();
    if (this.form().invalid()) {
      toast.error('Completa los campos obligatorios de la bitácora');
      return;
    }

    const model = this.model();
    const scheduleId = model.schedule_id;

    try {
      const editingId = this.editingLogId();
      if (editingId) {
        const request: UpdateCollectionLogRequest = {
          contact_date: model.contact_date,
          contact_channel: model.contact_channel as ContactChannel,
          notes: model.notes,
          next_follow_up_date: model.next_follow_up_date || null,
        };
        await this.creditControlStore.updateCollectionLog(editingId, request);
        toast.success('Bitácora actualizada');
      } else {
        const request: CreateCollectionLogRequest = {
          credit_account_schedule_id: scheduleId,
          contact_date: model.contact_date,
          contact_channel: model.contact_channel as ContactChannel,
          notes: model.notes,
          next_follow_up_date: model.next_follow_up_date || null,
        };
        await this.creditControlStore.createCollectionLog(request);
        toast.success('Bitácora registrada');
      }
      this.resetForm(scheduleId);
      this.logsResource.reload();
      this.schedulesChanged.emit();
    } catch {
      toast.error(this.creditControlStore.status().error ?? 'Error al guardar la bitácora');
    }
  }

  protected onAction(event: { action: string; row: CollectionLog }): void {
    const log = event.row;

    if (event.action === 'edit') {
      this.editingLogId.set(log.id);
      this.model.set({
        schedule_id: log.credit_account_schedule_id,
        contact_date: log.contact_date.split('T')[0],
        contact_channel: log.contact_channel,
        notes: log.notes,
        next_follow_up_date: log.next_follow_up_date ? log.next_follow_up_date.split('T')[0] : '',
      });
      return;
    }

    if (event.action === 'delete') {
      this.itemToDelete.set(log);
      this.deleteDialog()?.open();
    }
  }

  protected async onConfirmDelete(): Promise<void> {
    const log = this.itemToDelete();
    if (!log) {
      return;
    }

    try {
      await this.creditControlStore.deleteCollectionLog(log.id);
      toast.success('Bitácora eliminada');
      this.itemToDelete.set(null);
      this.logsResource.reload();
      this.schedulesChanged.emit();
    } catch {
      toast.error(this.creditControlStore.status().error ?? 'Error al eliminar la bitácora');
    }
  }

  protected resetForm(scheduleId: string): void {
    this.editingLogId.set(null);
    this.form().reset({ ...EMPTY_LOG, schedule_id: scheduleId });
  }
}
