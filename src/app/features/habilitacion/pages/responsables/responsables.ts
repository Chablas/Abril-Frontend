import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { TitleCasePipe } from '../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../shared/directives/abril-bulk-action.directive';
import { ClientPager } from '../../../../shared/utils/client-pager';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { ResponsablesService } from '../../../../core/services/responsables.service';
import {
  ResponsableProyectoDTO,
  ResponsableRazonSocialDTO,
  ResponsableWorkerOptionDTO,
  ResponsablesDTO,
} from '../../../../core/dtos/habilitacion/responsables.model';

@Component({
  selector: 'app-responsables',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    SearchSelect,
    SearchInput,
    Paginator,
    TitleCasePipe,
    AbrilBulkActionDirective,
  ],
  templateUrl: './responsables.html',
  styleUrl: './responsables.css',
})
export class Responsables implements OnInit {
  loading = false;
  data: ResponsablesDTO = { razonesSociales: [], proyectos: [], trabajadores: [] };

  razonesSocialesSearch = '';
  proyectosSearch = '';
  razonesSocialesPager = new ClientPager<ResponsableRazonSocialDTO>();
  proyectosPager = new ClientPager<ResponsableProyectoDTO>();

  /** workerId elegido en el picker por fila, antes de guardar (contributorId/projectId -> workerId). */
  pendingRazonSocialWorker: Record<number, number | null> = {};
  pendingProyectoWorker: Record<number, number | null> = {};
  savingRazonSocial: Record<number, boolean> = {};
  savingProyecto: Record<number, boolean> = {};

  constructor(
    private service: ResponsablesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.service.getAll().subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get filteredRazonesSociales(): ResponsableRazonSocialDTO[] {
    return this.data.razonesSociales.filter((r) =>
      SearchInput.matches(r.contributorName, this.razonesSocialesSearch),
    );
  }

  get pagedRazonesSociales(): ResponsableRazonSocialDTO[] {
    return this.razonesSocialesPager.page(this.filteredRazonesSociales);
  }

  get filteredProyectos(): ResponsableProyectoDTO[] {
    return this.data.proyectos.filter((p) =>
      SearchInput.matches(p.projectDescription, this.proyectosSearch),
    );
  }

  get pagedProyectos(): ResponsableProyectoDTO[] {
    return this.proyectosPager.page(this.filteredProyectos);
  }

  onRazonSocialSearch(): void {
    this.razonesSocialesPager.reset();
  }

  onProyectoSearch(): void {
    this.proyectosPager.reset();
  }

  trabajadorOptions(): ResponsableWorkerOptionDTO[] {
    return this.data.trabajadores;
  }

  /**
   * El correo guardado es texto suelto, no una referencia al trabajador (ver comentario en
   * ResponsablesDtos.cs) — si la persona ya no está activa (se retiró) o cambió de correo
   * corporativo, ese texto queda huérfano. `data.trabajadores` solo trae Casa no-retirados, así
   * que si el correo guardado ya no aparece ahí, se trata como "sin administrador asignado" en
   * vez de mostrar un correo de alguien que ya se fue.
   */
  private esCorreoVigente(email: string | null): boolean {
    if (!email) return false;
    const normalizado = email.trim().toLowerCase();
    return this.data.trabajadores.some((w) => w.email.trim().toLowerCase() === normalizado);
  }

  /** Correo de la razón social: el que se guardó (si sigue vigente), o el recién elegido (aún sin guardar). */
  emailRazonSocial(row: ResponsableRazonSocialDTO): string | null {
    const pendingId = this.pendingRazonSocialWorker[row.contributorId];
    if (pendingId != null) {
      return this.data.trabajadores.find((w) => w.workerId === pendingId)?.email ?? null;
    }
    return this.esCorreoVigente(row.emailAdministrador) ? row.emailAdministrador : null;
  }

  emailProyecto(row: ResponsableProyectoDTO): string | null {
    const pendingId = this.pendingProyectoWorker[row.projectId];
    if (pendingId != null) {
      return this.data.trabajadores.find((w) => w.workerId === pendingId)?.email ?? null;
    }
    return this.esCorreoVigente(row.emailCoordAdmin) ? row.emailCoordAdmin : null;
  }

  guardarRazonSocial(row: ResponsableRazonSocialDTO): void {
    const workerId = this.pendingRazonSocialWorker[row.contributorId];
    if (workerId == null) return;
    const email = this.data.trabajadores.find((w) => w.workerId === workerId)?.email ?? null;

    this.savingRazonSocial[row.contributorId] = true;
    this.service.updateRazonSocial(row.contributorId, email).subscribe({
      next: () => {
        row.emailAdministrador = email;
        delete this.pendingRazonSocialWorker[row.contributorId];
        this.savingRazonSocial[row.contributorId] = false;
        Swal.fire({ icon: 'success', title: 'Administrador actualizado', timer: 1200, showConfirmButton: false });
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.savingRazonSocial[row.contributorId] = false;
        this.errorService.handleError(err);
      },
    });
  }

  guardarProyecto(row: ResponsableProyectoDTO): void {
    const workerId = this.pendingProyectoWorker[row.projectId];
    if (workerId == null) return;
    const email = this.data.trabajadores.find((w) => w.workerId === workerId)?.email ?? null;

    this.savingProyecto[row.projectId] = true;
    this.service.updateProyecto(row.projectId, email).subscribe({
      next: () => {
        row.emailCoordAdmin = email;
        delete this.pendingProyectoWorker[row.projectId];
        this.savingProyecto[row.projectId] = false;
        Swal.fire({ icon: 'success', title: 'Coordinador actualizado', timer: 1200, showConfirmButton: false });
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.savingProyecto[row.projectId] = false;
        this.errorService.handleError(err);
      },
    });
  }
}
