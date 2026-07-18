import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect, inject, signal, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import PageHeader from '../../../../shared/components/page-header/page-header';
import {
  FluentCheckbox,
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import { CreateTeamMemberRequest, TeamMember, UpdateTeamMemberRequest } from '../../../../core/models/team.model';
import { TeamsService } from '../../../teams/services/teams';
import { TeamsStore } from '../../../teams/store/teams.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

interface TeamMemberFormModel {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  document_type: string;
  document_number: string;
  position: string;
  management_id: string | null;
  area_id: string | null;
  create_account: boolean;
  hire_date: string;
  status?: TeamMember['status'];
}

const EMPTY_MEMBER: TeamMemberFormModel = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  document_type: 'DNI',
  document_number: '',
  position: '',
  management_id: null,
  area_id: null,
  create_account: false,
  hire_date: new Date().toISOString().split('T')[0],
};

@Component({
  selector: 'app-team-form',
  imports: [PageHeader, InfoTip, FormField, FluentTextInput, FluentDropdown, FluentCheckbox],
  templateUrl: './team-form.html',
  styleUrl: './team-form.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class TeamForm {
  private readonly teamsService = inject(TeamsService);
  private readonly teamsStore = inject(TeamsStore);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly memberId = signal<string | null>(this.route.snapshot.paramMap.get('id'));
  protected readonly memberModel = signal<TeamMemberFormModel>(EMPTY_MEMBER);

  protected readonly memberForm = form(this.memberModel, (schema) => {
    required(schema.first_name, { message: 'El nombre es obligatorio.' });
    required(schema.last_name, { message: 'El apellido es obligatorio.' });
    required(schema.email, { message: 'El correo es obligatorio.' });
  });

  /** Recurso reactivo que carga el miembro cuando se edita uno existente. */
  private readonly memberResource = apiResourceWithRequest<TeamMember | null, string | null>(
    () => this.memberId(),
    async ({ params }) => {
      if (!params || params === 'new') {
        return null;
      }
      try {
        return await toApiPromise(this.teamsService.getTeamMember(params));
      } catch {
        toast.error('Error al cargar miembro');
        return null;
      }
    }
  );

  protected readonly loading = computed(() => this.memberResource.isLoading());
  protected readonly saving = computed(() => this.teamsStore.status().loading);

  constructor() {
    effect(() => {
      const data = this.memberResource.value();
      if (!data) {
        this.memberModel.set(EMPTY_MEMBER);
        return;
      }
      this.memberModel.set({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        document_type: data.document_type,
        document_number: data.document_number,
        position: data.position,
        management_id: data.management_id,
        area_id: data.area_id,
        create_account: data.has_account,
        status: data.status,
        hire_date: data.hire_date,
      });
    });
  }

  protected async onSubmit(): Promise<void> {
    this.memberForm().markAsTouched();

    if (this.memberForm().invalid()) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    const id = this.memberId();

    try {
      if (id && id !== 'new') {
        const update: UpdateTeamMemberRequest = { ...this.memberModel() };
        await this.teamsStore.updateTeamMember(id, update);
        toast.success('Miembro actualizado');
      } else {
        const create: CreateTeamMemberRequest = this.memberModel();
        await this.teamsStore.createTeamMember(create);
        toast.success('Miembro creado');
      }
      await this.router.navigate(['/teams']);
    } catch {
      toast.error(this.teamsStore.status().error ?? 'Error al guardar');
    }
  }
}
