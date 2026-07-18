import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { TeamsService } from '../services/teams';
import {
  AssignResponsibleRequest,
  CreateTeamMemberRequest,
  DeactivateTeamMemberRequest,
  TeamMember,
  UpdateTeamMemberRequest,
} from '../../../core/models/team.model';
import { CreateFolderRequest, FileItem, Folder, FolderContentResponse } from '../../../core/models/file.model';
import { initialStoreStatus, StoreStatus } from '../../../core/utils/store-status';
import { toApiPromise } from '../../../core/utils/api-response';
import { setStoreError, setStoreLoading, setStoreSuccess } from '../../../core/utils/store-helpers';

interface TeamsState {
  status: StoreStatus;
}

const initialState: TeamsState = {
  status: initialStoreStatus,
};

/**
 * Store de equipos. Gestiona operaciones de escritura sobre miembros,
 * carpetas, archivos y responsables.
 */
export const TeamsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, teamsService = inject(TeamsService)) => ({
    /**
     * Crea un nuevo miembro del equipo.
     * @param request Datos del miembro.
     * @returns Miembro creado.
     */
    async createTeamMember(request: CreateTeamMemberRequest): Promise<TeamMember> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(teamsService.createTeamMember(request));
        setStoreSuccess(store);
        return response.team_member;
      } catch (error) {
        setStoreError(store, error, 'Error al crear el miembro');
        throw error;
      }
    },

    /**
     * Actualiza un miembro del equipo.
     * @param id Identificador del miembro.
     * @param request Datos a actualizar.
     * @returns Miembro actualizado.
     */
    async updateTeamMember(id: string, request: UpdateTeamMemberRequest): Promise<TeamMember> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(teamsService.updateTeamMember(id, request));
        setStoreSuccess(store);
        return response;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar el miembro');
        throw error;
      }
    },

    /**
     * Desactiva un miembro del equipo.
     * @param id Identificador del miembro.
     * @param request Motivo opcional.
     */
    async deactivateTeamMember(id: string, request: DeactivateTeamMemberRequest = {}): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(teamsService.deactivateTeamMember(id, request));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al desactivar el miembro');
        throw error;
      }
    },

    /**
     * Asigna a un miembro como responsable de una gerencia o área.
     * @param id Identificador del miembro.
     * @param request IDs de gerencia y/o área.
     */
    async assignResponsible(id: string, request: AssignResponsibleRequest): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(teamsService.assignResponsible(id, request));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al asignar responsable');
        throw error;
      }
    },

    /**
     * Crea una carpeta de documentos para un miembro.
     * @param teamMemberId Identificador del miembro.
     * @param request Datos de la carpeta.
     * @returns Carpeta creada.
     */
    async createFolder(teamMemberId: string, request: CreateFolderRequest): Promise<Folder> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(teamsService.createFolder(teamMemberId, request));
        setStoreSuccess(store);
        return response;
      } catch (error) {
        setStoreError(store, error, 'Error al crear la carpeta');
        throw error;
      }
    },

    /**
     * Sube un archivo para un miembro.
     * @param teamMemberId Identificador del miembro.
     * @param file Archivo binario.
     * @param folderId Carpeta destino opcional.
     * @returns Archivo subido.
     */
    async uploadFile(teamMemberId: string, file: File, folderId?: string | null): Promise<FileItem> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(teamsService.uploadFile(teamMemberId, file, folderId));
        setStoreSuccess(store);
        return response;
      } catch (error) {
        setStoreError(store, error, 'Error al subir el archivo');
        throw error;
      }
    },

    /**
     * Elimina un archivo de un miembro.
     * @param teamMemberId Identificador del miembro.
     * @param fileId Identificador del archivo.
     */
    async deleteFile(teamMemberId: string, fileId: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(teamsService.deleteFile(teamMemberId, fileId));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar el archivo');
        throw error;
      }
    },

    /**
     * Limpia el mensaje de error del store.
     */
    clearError(): void {
      patchState(store, (state) => ({ status: { ...state.status, error: null } }));
    },
  }))
);
