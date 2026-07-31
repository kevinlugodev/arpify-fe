import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../../core/services/api';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  AssignResponsibleRequest,
  CreateFolderRequest,
  CreateTeamMemberRequest,
  DeactivateTeamMemberRequest,
  FileItem,
  Folder,
  FolderContentResponse,
  TeamListFilters,
  TeamListResponse,
  TeamMember,
  UpdateTeamMemberRequest,
} from '../../../core/models';

/**
 * Servicio de equipos. Expone operaciones HTTP de miembros y documentos.
 */
@Service()
export class TeamsService {
  private readonly api = inject(Api);

  /**
   * Lista los miembros del equipo con filtros opcionales.
   * @param filters Filtros de búsqueda y paginación.
   */
  getTeamMembers(filters: TeamListFilters = {}): Observable<ApiResponse<TeamListResponse>> {
    return this.api.get<TeamListResponse>('teams', filters);
  }

  /**
   * Crea un nuevo miembro del equipo.
   * @param request Datos del miembro.
   */
  createTeamMember(request: CreateTeamMemberRequest): Observable<ApiResponse<{ team_member: TeamMember }>> {
    return this.api.post<{ team_member: TeamMember }>('teams', request);
  }

  /**
   * Obtiene un miembro del equipo por ID.
   * @param id Identificador del miembro.
   */
  getTeamMember(id: string): Observable<ApiResponse<{ team_member: TeamMember }>> {
    return this.api.get<{ team_member: TeamMember }>(`teams/${id}`);
  }

  /**
   * Actualiza un miembro del equipo.
   * @param id Identificador del miembro.
   * @param request Datos a actualizar.
   */
  updateTeamMember(id: string, request: UpdateTeamMemberRequest): Observable<ApiResponse<TeamMember>> {
    return this.api.put<TeamMember>(`teams/${id}`, request);
  }

  /**
   * Desactiva un miembro del equipo (soft-delete).
   * @param id Identificador del miembro.
   * @param request Motivo opcional.
   */
  deactivateTeamMember(id: string, request: DeactivateTeamMemberRequest = {}): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`teams/${id}`);
  }

  /**
   * Asigna al miembro como responsable de una gerencia o área.
   * @param id Identificador del miembro.
   * @param request IDs de gerencia y/o área.
   */
  assignResponsible(id: string, request: AssignResponsibleRequest): Observable<ApiResponse<unknown>> {
    return this.api.post<unknown>(`teams/${id}/assign-responsible`, request);
  }

  /**
   * Crea una carpeta de documentos para un miembro.
   * @param teamMemberId Identificador del miembro.
   * @param request Datos de la carpeta.
   */
  createFolder(teamMemberId: string, request: CreateFolderRequest): Observable<ApiResponse<Folder>> {
    return this.api.post<Folder>(`teams/${teamMemberId}/folders`, request);
  }

  /**
   * Lista el contenido de una carpeta.
   * @param teamMemberId Identificador del miembro.
   * @param folderId Identificador de la carpeta.
   */
  getFolderContent(teamMemberId: string, folderId: string): Observable<ApiResponse<FolderContentResponse>> {
    return this.api.get<FolderContentResponse>(`teams/${teamMemberId}/folders/${folderId}`);
  }

  /**
   * Sube un archivo para un miembro.
   * @param teamMemberId Identificador del miembro.
   * @param file Archivo binario.
   * @param folderId Carpeta destino opcional.
   */
  uploadFile(teamMemberId: string, file: File, folderId?: string | null): Observable<ApiResponse<FileItem>> {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folder_id', folderId);
    }
    return this.api.post<FileItem>(`teams/${teamMemberId}/files`, formData);
  }

  /**
   * Obtiene los metadatos de un archivo.
   * @param teamMemberId Identificador del miembro.
   * @param fileId Identificador del archivo.
   */
  getFileMetadata(teamMemberId: string, fileId: string): Observable<ApiResponse<FileItem>> {
    return this.api.get<FileItem>(`teams/${teamMemberId}/files/${fileId}`);
  }

  /**
   * Elimina un archivo.
   * @param teamMemberId Identificador del miembro.
   * @param fileId Identificador del archivo.
   */
  deleteFile(teamMemberId: string, fileId: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`teams/${teamMemberId}/files/${fileId}`);
  }
}
