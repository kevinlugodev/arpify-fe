import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from './api';
import { ApiResponse } from '../models/api-response.model';
import { SeedRequest, SeedResponse } from '../models/seed.model';

@Service()
export class Seed {
  private readonly api = inject(Api);

  create(request: SeedRequest): Observable<ApiResponse<SeedResponse>> {
    return this.api.post<SeedResponse>('seed', request);
  }
}
