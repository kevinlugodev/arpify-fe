import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../../core/services/api';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  Campaign,
  CreateCampaignRequest,
  CreateEmailTemplateRequest,
  EmailTemplate,
  MassEmailLog,
  PreviewTemplateRequest,
  UpdateCampaignRequest,
  UpdateEmailTemplateRequest,
} from '../../../core/models/mass-email.model';

/**
 * Servicio de correos masivos. Expone operaciones HTTP de plantillas, campañas y logs.
 */
@Service()
export class MassEmailsService {
  private readonly api = inject(Api);

  /**
   * Lista todas las plantillas de correo.
   */
  getTemplates(): Observable<ApiResponse<EmailTemplate[]>> {
    return this.api.get<EmailTemplate[]>('mass-emails/templates');
  }

  /**
   * Crea una plantilla de correo.
   * @param request Datos de la plantilla.
   */
  createTemplate(request: CreateEmailTemplateRequest): Observable<ApiResponse<EmailTemplate>> {
    return this.api.post<EmailTemplate>('mass-emails/templates', request);
  }

  /**
   * Previsualiza una plantilla renderizada.
   * @param id Identificador de la plantilla.
   * @param request Datos para renderizar.
   */
  previewTemplate(id: string, request: PreviewTemplateRequest): Observable<ApiResponse<string>> {
    return this.api.post<string>(`mass-emails/templates/${id}/preview`, request);
  }

  /**
   * Lista todas las campañas.
   */
  getCampaigns(): Observable<ApiResponse<Campaign[]>> {
    return this.api.get<Campaign[]>('mass-emails/campaigns');
  }

  /**
   * Crea una campaña.
   * @param request Datos de la campaña.
   */
  createCampaign(request: CreateCampaignRequest): Observable<ApiResponse<Campaign>> {
    return this.api.post<Campaign>('mass-emails/campaigns', request);
  }

  /**
   * Ejecuta manualmente una campaña.
   * @param id Identificador de la campaña.
   */
  runCampaign(id: string): Observable<ApiResponse<unknown>> {
    return this.api.post<unknown>(`mass-emails/campaigns/${id}/run`, {});
  }

  /**
   * Lista los logs de envío de correos.
   */
  getLogs(): Observable<ApiResponse<MassEmailLog[]>> {
    return this.api.get<MassEmailLog[]>('mass-emails/logs');
  }
}
