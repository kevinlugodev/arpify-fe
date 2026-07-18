import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

@Service()
export class Api {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  get<T>(url: string, params?: HttpParams | Record<string, unknown>): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(this.buildUrl(url), { params: this.toHttpParams(params) });
  }

  post<T>(url: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(this.buildUrl(url), body);
  }

  put<T>(url: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(this.buildUrl(url), body);
  }

  patch<T>(url: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(this.buildUrl(url), body);
  }

  delete<T>(url: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(this.buildUrl(url));
  }

  private buildUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  private toHttpParams(params?: HttpParams | Record<string, unknown>): HttpParams | undefined {
    if (!params) {
      return undefined;
    }
    if (params instanceof HttpParams) {
      return params;
    }
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return httpParams;
  }
}
