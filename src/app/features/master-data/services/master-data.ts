import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../../core/services/api';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  Area,
  AreaListResponse,
  CreateAreaRequest,
  CreateManagementRequest,
  Management,
  ManagementListResponse,
  UpdateAreaRequest,
  UpdateManagementRequest,
} from '../../../core/models/master-data.model';

/**
 * Servicio de datos maestros. Expone operaciones HTTP de gerencias y áreas.
 */
@Service()
export class MasterDataService {
  private readonly api = inject(Api);

  /**
   * Lista todas las gerencias del tenant.
   */
  getManagements(): Observable<ApiResponse<ManagementListResponse>> {
    return this.api.get<ManagementListResponse>('master/managements');
  }

  /**
   * Crea una nueva gerencia.
   * @param request Datos de la gerencia.
   */
  createManagement(request: CreateManagementRequest): Observable<ApiResponse<Management>> {
    return this.api.post<Management>('master/managements', request);
  }

  /**
   * Obtiene una gerencia por ID.
   * @param id Identificador de la gerencia.
   */
  getManagement(id: string): Observable<ApiResponse<Management>> {
    return this.api.get<Management>(`master/managements/${id}`);
  }

  /**
   * Actualiza una gerencia.
   * @param id Identificador de la gerencia.
   * @param request Datos a actualizar.
   */
  updateManagement(id: string, request: UpdateManagementRequest): Observable<ApiResponse<Management>> {
    return this.api.put<Management>(`master/managements/${id}`, request);
  }

  /**
   * Elimina una gerencia (soft-delete).
   * @param id Identificador de la gerencia.
   */
  deleteManagement(id: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`master/managements/${id}`);
  }

  /**
   * Lista todas las áreas del tenant.
   */
  getAreas(): Observable<ApiResponse<AreaListResponse>> {
    return this.api.get<AreaListResponse>('master/areas');
  }

  /**
   * Crea una nueva área.
   * @param request Datos del área.
   */
  createArea(request: CreateAreaRequest): Observable<ApiResponse<Area>> {
    return this.api.post<Area>('master/areas', request);
  }

  /**
   * Obtiene un área por ID.
   * @param id Identificador del área.
   */
  getArea(id: string): Observable<ApiResponse<Area>> {
    return this.api.get<Area>(`master/areas/${id}`);
  }

  /**
   * Actualiza un área.
   * @param id Identificador del área.
   * @param request Datos a actualizar.
   */
  updateArea(id: string, request: UpdateAreaRequest): Observable<ApiResponse<Area>> {
    return this.api.put<Area>(`master/areas/${id}`, request);
  }

  /**
   * Elimina un área (soft-delete).
   * @param id Identificador del área.
   */
  deleteArea(id: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`master/areas/${id}`);
  }
}
