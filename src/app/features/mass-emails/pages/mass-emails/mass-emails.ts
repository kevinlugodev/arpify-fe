import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, resource, signal, ViewEncapsulation } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import DataTable, { DataTableColumn } from '../../../../shared/components/data-table/data-table';
import {
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import PageHeader from '../../../../shared/components/page-header/page-header';
import { Campaign, EmailTemplate, MassEmailLog } from '../../../../core/models/mass-email.model';
import { MassEmailsService } from '../../../mass-emails/services/mass-emails';
import { MassEmailsStore } from '../../../mass-emails/store/mass-emails.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource } from '../../../../core/utils/resource-helpers';

type Tab = 'templates' | 'campaigns' | 'logs';

interface TemplateFormModel {
  name: string;
  subject_template: string;
  body_template: string;
}

interface CampaignFormModel {
  name: string;
  template_id: string;
}

@Component({
  selector: 'app-mass-emails',
  imports: [PageHeader, DataTable, EmptyState, InfoTip, FormField, FluentTextInput, FluentDropdown],
  templateUrl: './mass-emails.html',
  styleUrl: './mass-emails.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class MassEmailsPage {
  private readonly massEmailsService = inject(MassEmailsService);
  private readonly massEmailsStore = inject(MassEmailsStore);

  protected readonly activeTab = signal<Tab>('templates');

  protected readonly templateModel = signal<TemplateFormModel>({ name: '', subject_template: '', body_template: '' });
  protected readonly templateForm = form(this.templateModel, (schema) => {
    required(schema.name, { message: 'El nombre es obligatorio.' });
    required(schema.subject_template, { message: 'El asunto es obligatorio.' });
  });

  protected readonly campaignModel = signal<CampaignFormModel>({ name: '', template_id: '' });
  protected readonly campaignForm = form(this.campaignModel, (schema) => {
    required(schema.name, { message: 'El nombre de la campaña es obligatorio.' });
    required(schema.template_id, { message: 'Selecciona una plantilla.' });
  });

  /** Recurso reactivo de plantillas de correo. */
  private readonly templatesResource = apiResource<EmailTemplate[]>(async () => {
    try {
      return await toApiPromise(this.massEmailsService.getTemplates());
    } catch {
      toast.error('Error al cargar plantillas');
      return [];
    }
  });

  /** Recurso reactivo de campañas. */
  private readonly campaignsResource = apiResource<Campaign[]>(async () => {
    try {
      return await toApiPromise(this.massEmailsService.getCampaigns());
    } catch {
      toast.error('Error al cargar campañas');
      return [];
    }
  });

  /** Recurso reactivo de logs de envío. */
  private readonly logsResource = apiResource<MassEmailLog[]>(async () => {
    try {
      return await toApiPromise(this.massEmailsService.getLogs());
    } catch {
      toast.error('Error al cargar logs');
      return [];
    }
  });

  protected readonly templates = computed<EmailTemplate[]>(() => this.templatesResource.value() ?? []);
  protected readonly campaigns = computed<Campaign[]>(() => this.campaignsResource.value() ?? []);
  protected readonly logs = computed<MassEmailLog[]>(() => this.logsResource.value() ?? []);
  protected readonly loading = computed(
    () => this.templatesResource.isLoading() || this.campaignsResource.isLoading() || this.logsResource.isLoading()
  );

  protected readonly templateColumns: DataTableColumn<EmailTemplate>[] = [
    { key: 'name', header: 'Nombre' },
    { key: 'subject_template', header: 'Asunto' },
  ];

  protected readonly campaignColumns: DataTableColumn<Campaign>[] = [
    { key: 'name', header: 'Nombre' },
    { key: 'schedule_type', header: 'Programación' },
    { key: 'enabled', header: 'Activa' },
  ];

  protected readonly logColumns: DataTableColumn<MassEmailLog>[] = [
    { key: 'recipient', header: 'Destinatario', type: 'email' },
    { key: 'status', header: 'Estado', type: 'status', statusDomain: 'mass-email' },
    { key: 'sent_at', header: 'Enviado', type: 'relative' },
  ];

  protected async onCreateTemplate(): Promise<void> {
    this.templateForm().markAsTouched();

    if (this.templateForm().invalid()) {
      return;
    }

    try {
      await this.massEmailsStore.createTemplate(this.templateModel());
      toast.success('Plantilla creada');
      this.templateModel.set({ name: '', subject_template: '', body_template: '' });
      this.templatesResource.reload();
    } catch {
      toast.error(this.massEmailsStore.status().error ?? 'Error al crear');
    }
  }

  protected async onCreateCampaign(): Promise<void> {
    this.campaignForm().markAsTouched();

    if (this.campaignForm().invalid()) {
      return;
    }

    try {
      await this.massEmailsStore.createCampaign({
        name: this.campaignModel().name,
        template_id: this.campaignModel().template_id,
        schedule_type: 'manual',
      });
      toast.success('Campaña creada');
      this.campaignModel.set({ name: '', template_id: '' });
      this.campaignsResource.reload();
    } catch {
      toast.error(this.massEmailsStore.status().error ?? 'Error al crear');
    }
  }

  protected async onRunCampaign(campaign: Campaign): Promise<void> {
    try {
      await this.massEmailsStore.runCampaign(campaign.id);
      toast.success('Campaña ejecutada');
    } catch {
      toast.error(this.massEmailsStore.status().error ?? 'Error al ejecutar');
    }
  }
}
