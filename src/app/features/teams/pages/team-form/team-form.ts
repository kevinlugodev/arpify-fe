import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import {
  Area,
  AreaListResponse,
  Management,
  ManagementListResponse,
} from '../../../../core/models/master-data.model';
import { CreateTeamMemberRequest, TeamMember, UpdateTeamMemberRequest } from '../../../../core/models/team.model';
import { MasterDataService } from '../../../master-data/services/master-data';
import { TeamsService } from '../../../teams/services/teams';
import { TeamsStore } from '../../../teams/store/teams.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource, apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

interface TeamMemberFormModel {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  province: string;
  district: string;
  address: string;
  birth_date: string;
  document_type: string;
  document_number: string;
  position: string;
  management_id: string;
  area_id: string;
  hire_date: string;
  status: TeamMember['status'];
  create_account: boolean;
}

interface FormStep {
  id: number;
  title: string;
  description: string;
}

const STEPS: FormStep[] = [
  { id: 1, title: 'Información personal', description: 'Datos de contacto básicos' },
  { id: 2, title: 'Documento de identidad', description: 'Tipo y número de documento' },
  { id: 3, title: 'Información laboral', description: 'Cargo, gerencia, área y fecha de ingreso' },
  { id: 4, title: 'Cuenta de usuario', description: 'Acceso a la plataforma' },
];

const EMPTY_MEMBER: TeamMemberFormModel = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  department: '',
  province: '',
  district: '',
  address: '',
  birth_date: '',
  document_type: 'DNI',
  document_number: '',
  position: '',
  management_id: '',
  area_id: '',
  hire_date: new Date().toISOString().split('T')[0],
  status: 'active',
  create_account: false,
};

@Component({
  selector: 'app-team-form',
  imports: [FormsModule, PageHeader, InfoTip, FormField, FluentTextInput, FluentDropdown, FluentCheckbox, DecimalPipe],
  templateUrl: './team-form.html',
  styleUrl: './team-form.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class TeamForm {
  private readonly teamsService = inject(TeamsService);
  private readonly teamsStore = inject(TeamsStore);
  private readonly masterDataService = inject(MasterDataService);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly memberId = signal<string | null>(this.route.snapshot.paramMap.get('id'));
  protected readonly memberModel = signal<TeamMemberFormModel>(EMPTY_MEMBER);
  protected readonly currentStep = signal(1);
  protected readonly steps = STEPS;

  protected readonly memberForm;

  /** Recurso reactivo que carga el miembro cuando se edita uno existente. */
  private readonly memberResource = apiResourceWithRequest<TeamMember | null, string | null>(
    () => this.memberId(),
    async ({ params }) => {
      if (!params || params === 'new') {
        return null;
      }
      try {
        const response = await toApiPromise(this.teamsService.getTeamMember(params));
        return response.team_member;
      } catch {
        toast.error('Error al cargar miembro');
        return null;
      }
    }
  );

  /** Recurso reactivo de gerencias. */
  private readonly managementsResource = apiResource<ManagementListResponse>(async () => {
    try {
      return await toApiPromise(this.masterDataService.getManagements());
    } catch {
      toast.error('Error al cargar gerencias');
      return { items: [], total: 0 };
    }
  });

  /** Recurso reactivo de áreas. */
  private readonly areasResource = apiResource<AreaListResponse>(async () => {
    try {
      return await toApiPromise(this.masterDataService.getAreas());
    } catch {
      toast.error('Error al cargar áreas');
      return { items: [], total: 0 };
    }
  });

  protected readonly loading = computed(() => this.memberResource.isLoading());
  protected readonly saving = computed(() => this.teamsStore.status().loading);
  protected readonly isLastStep = computed(() => this.currentStep() === this.steps.length);
  protected readonly isEditMode = computed(() => {
    const id = this.memberId();
    return !!id && id !== 'new';
  });

  protected readonly managements = computed<Management[]>(() => this.managementsResource.value()?.items ?? []);
  protected readonly areas = computed<Area[]>(() => this.areasResource.value()?.items ?? []);

  /**
   * Indica si se deben ocultar los campos de gerencia y área laborales.
   * Esto ocurre cuando el miembro ya es responsable de una gerencia o área.
   */
  protected readonly hidesOrganizationalFields = computed(() => {
    const data = this.memberResource.value();
    if (!data) {
      return false;
    }
    return !!data.responsible_for_management_id;
  });

  constructor() {
    this.memberForm = form(this.memberModel, (schema) => {
      required(schema.first_name, { message: 'El nombre es obligatorio.' });
      required(schema.last_name, { message: 'El apellido es obligatorio.' });
      required(schema.email, { message: 'El correo es obligatorio.' });
      required(schema.document_type, { message: 'El tipo de documento es obligatorio.' });
      required(schema.document_number, { message: 'El número de documento es obligatorio.' });
      required(schema.position, { message: 'El cargo es obligatorio.' });
      required(schema.hire_date, { message: 'La fecha de contratación es obligatoria.' });
      required(schema.status, { message: 'El estado es obligatorio.' });
    });

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
        phone: data.phone ?? '',
        department: data.department ?? '',
        province: data.province ?? '',
        district: data.district ?? '',
        address: data.address ?? '',
        birth_date: data.birth_date ? data.birth_date.split('T')[0] : '',
        document_type: data.document_type,
        document_number: data.document_number,
        position: data.position ?? '',
        management_id: data.management_id ?? '',
        area_id: data.area_id ?? '',
        hire_date: data.hire_date ? data.hire_date.split('T')[0] : '',
        status: data.status,
        create_account: data.has_account,
      });
    });
  }

  /**
   * Valida los campos del paso actual antes de permitir avanzar.
   */
  protected canGoNext(): boolean {
    this.memberForm().markAsTouched();
    return this.isStepValid(this.currentStep());
  }

  protected isStepValid(step: number): boolean {
    const form = this.memberForm() as any;
    switch (step) {
      case 1:
        return !(form.first_name().invalid() || form.last_name().invalid() || form.email().invalid());
      case 2:
        return !(form.document_type().invalid() || form.document_number().invalid());
      case 3:
        return !(form.position().invalid() || form.hire_date().invalid() || form.status().invalid());
      case 4:
        return true;
      default:
        return false;
    }
  }

  protected goToStep(step: number): void {
    if (step < 1 || step > this.steps.length) {
      return;
    }
    if (step > this.currentStep() && !this.canGoNext()) {
      toast.error('Completa los campos obligatorios de este paso');
      return;
    }
    this.currentStep.set(step);
  }

  protected nextStep(): void {
    if (!this.canGoNext()) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    if (this.currentStep() < this.steps.length) {
      this.currentStep.update((step) => step + 1);
    }
  }

  protected previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update((step) => step - 1);
    }
  }

  /**
   * Avanza al siguiente paso o envía el formulario cuando el usuario presiona ENTER.
   */
  protected handleEnter(event: Event): void {
    event.preventDefault();
    if (this.isLastStep()) {
      void this.onSubmit();
    } else {
      this.nextStep();
    }
  }

  protected async onSubmit(): Promise<void> {
    this.memberForm().markAsTouched();

    if (this.memberForm().invalid()) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    const id = this.memberId();
    const model = this.memberModel();

    try {
      if (id && id !== 'new') {
        const update: UpdateTeamMemberRequest = {
          first_name: model.first_name,
          last_name: model.last_name,
          email: model.email,
          phone: model.phone || undefined,
          department: model.department || undefined,
          province: model.province || undefined,
          district: model.district || undefined,
          address: model.address || undefined,
          birth_date: model.birth_date || null,
          document_type: model.document_type || undefined,
          document_number: model.document_number || undefined,
          position: model.position || undefined,
          management_id: model.management_id || null,
          area_id: model.area_id || null,
          status: model.status,
          hire_date: model.hire_date || undefined,
          metadata: {},
        };
        await this.teamsStore.updateTeamMember(id, update);
        toast.success('Miembro actualizado');
      } else {
        const create: CreateTeamMemberRequest = {
          first_name: model.first_name,
          last_name: model.last_name,
          email: model.email,
          phone: model.phone || undefined,
          department: model.department || undefined,
          province: model.province || undefined,
          district: model.district || undefined,
          address: model.address || undefined,
          birth_date: model.birth_date || null,
          document_type: model.document_type || undefined,
          document_number: model.document_number || undefined,
          position: model.position || undefined,
          management_id: model.management_id || null,
          area_id: model.area_id || null,
          hire_date: model.hire_date || undefined,
          create_account: model.create_account,
          metadata: {},
        };
        await this.teamsStore.createTeamMember(create);
        toast.success('Miembro creado');
      }
      await this.router.navigate(['/teams']);
    } catch {
      toast.error(this.teamsStore.status().error ?? 'Error al guardar');
    }
  }
}
