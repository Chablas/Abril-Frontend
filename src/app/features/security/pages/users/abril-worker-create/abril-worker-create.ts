import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { UserFeatureService } from '../services/user-feature.service';
import { RoleService } from '../../../../../core/services/role.service';
import { AbrilWorkerOptionDto } from '../../../../../core/dtos/user/abrilWorkerOption.model';
import { RoleSimpleDTO } from '../../../../../core/dtos/role/RoleSimpleDTO.model';
import { Roles } from '../../../../../core/constants/roles';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { MultiSearchSelect } from '../../../../../shared/components/multi-search-select/multi-search-select';
import Swal from 'sweetalert2';

/** Opción de trabajador con etiqueta lista para el desplegable (nombre + DNI). */
interface WorkerOption extends AbrilWorkerOptionDto {
  label: string;
}

@Component({
  selector: 'app-abril-worker-create',
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect, MultiSearchSelect],
  templateUrl: './abril-worker-create.html',
  styleUrl: './abril-worker-create.css',
})
export class AbrilWorkerCreate implements OnInit {
  workers: WorkerOption[] = [];
  roles: RoleSimpleDTO[] = [];

  selectedPersonId: number | null = null;
  selectedRoleIds: number[] = [];

  @Output() closeModal = new EventEmitter<void>();
  @Output() userCreated = new EventEmitter<void>();

  constructor(
    private userFeatureService: UserFeatureService,
    private roleService: RoleService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    // Una sola "tanda" de carga: trabajadores sin usuario + roles disponibles.
    this.userFeatureService.getAbrilWorkersWithoutUser().subscribe({
      next: (workers) => {
        this.workers = workers.map((w) => ({
          ...w,
          label: w.documentIdentityCode ? `${w.fullName} — ${w.documentIdentityCode}` : w.fullName,
        }));
        this.roleService.getRoles().subscribe({
          next: (roles) => {
            this.roles = roles;
            // Preseleccionar "USUARIO DE ABRIL" si existe en el catálogo.
            const usuarioAbril = roles.find((r) => r.roleDescription === Roles.USUARIO_DE_ABRIL);
            this.selectedRoleIds = usuarioAbril ? [usuarioAbril.roleId] : [];
            this.loaderService.hide();
          },
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  get selectedWorkerEmail(): string | null {
    return this.workers.find((w) => w.personId === this.selectedPersonId)?.emailCorporativo ?? null;
  }

  /** Al elegir un trabajador Staff, se preselecciona además el rol EVALUADOR (si no estaba ya). */
  onWorkerSelected(personId: number | null): void {
    this.selectedPersonId = personId;
    const worker = this.workers.find((w) => w.personId === personId);
    if (worker?.obraOficina === 'Staff') {
      const evaluador = this.roles.find((r) => r.roleDescription === Roles.EVALUADOR);
      if (evaluador && !this.selectedRoleIds.includes(evaluador.roleId)) {
        this.selectedRoleIds = [...this.selectedRoleIds, evaluador.roleId];
      }
    }
  }

  saveUser(): void {
    const errors: string[] = [];
    if (!this.selectedPersonId) errors.push('Trabajador de Abril');
    if (this.selectedRoleIds.length === 0) errors.push('Rol (debe asignar al menos uno)');

    if (errors.length > 0) {
      const listHtml = errors.map((e) => `<li>${e}</li>`).join('');
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        html: `<p style="font-size:0.85rem;color:#666;margin-bottom:8px">Por favor completa los siguientes campos:</p>
               <ul style="text-align:left;font-size:0.85rem;padding-left:1.4rem;line-height:2">${listHtml}</ul>`,
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    this.loaderService.show();
    this.userFeatureService
      .createAbrilWorkerUser({ personId: this.selectedPersonId!, roleIds: this.selectedRoleIds })
      .subscribe({
        next: () => {
          this.loaderService.hide();
          this.userCreated.emit();
          this.closeModal.emit();
          Swal.fire({ title: 'Usuario creado exitosamente', icon: 'success', draggable: true });
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
  }
}
