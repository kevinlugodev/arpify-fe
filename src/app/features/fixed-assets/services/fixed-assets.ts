import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../../core/services/api';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  CreateFixedAssetRequest,
  DepreciateRequest,
  DepreciationLog,
  DepreciationLogFilters,
  DepreciationLogListResponse,
  FixedAsset,
  FixedAssetFilters,
  FixedAssetListResponse,
  UpdateFixedAssetRequest,
} from '../../../core/models/fixed-assets.model';

/**
 * Servicio de activos fijos. Expone operaciones HTTP del módulo Fixed Assets.
 */
@Service()
export class FixedAssetsService {
  private readonly api = inject(Api);

  getFixedAssets(filters: FixedAssetFilters = {}): Observable<ApiResponse<FixedAssetListResponse>> {
    return this.api.get<FixedAssetListResponse>('fixed-assets', filters);
  }

  getFixedAsset(id: string): Observable<ApiResponse<{ fixed_asset: FixedAsset }>> {
    return this.api.get<{ fixed_asset: FixedAsset }>(`fixed-assets/${id}`);
  }

  createFixedAsset(
    request: CreateFixedAssetRequest,
  ): Observable<ApiResponse<{ fixed_asset: FixedAsset }>> {
    return this.api.post<{ fixed_asset: FixedAsset }>('fixed-assets', request);
  }

  updateFixedAsset(
    id: string,
    request: UpdateFixedAssetRequest,
  ): Observable<ApiResponse<{ fixed_asset: FixedAsset }>> {
    return this.api.put<{ fixed_asset: FixedAsset }>(`fixed-assets/${id}`, request);
  }

  deleteFixedAsset(id: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`fixed-assets/${id}`);
  }

  depreciate(
    id: string,
    request: DepreciateRequest,
  ): Observable<ApiResponse<{ log: DepreciationLog }>> {
    return this.api.post<{ log: DepreciationLog }>(`fixed-assets/${id}/depreciate`, request);
  }

  getDepreciationLogs(
    id: string,
    filters: DepreciationLogFilters = {},
  ): Observable<ApiResponse<DepreciationLogListResponse>> {
    return this.api.get<DepreciationLogListResponse>(
      `fixed-assets/${id}/depreciation-logs`,
      filters,
    );
  }

  getDepreciationLog(id: string, logId: string): Observable<ApiResponse<{ log: DepreciationLog }>> {
    return this.api.get<{ log: DepreciationLog }>(`fixed-assets/${id}/depreciation-logs/${logId}`);
  }
}
