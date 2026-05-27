import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import {
  ContratistaUsuarioDto,
  ContratistaUsuarioService,
  InvitarUsuarioDto,
  ActualizarUsuarioDto,
} from '../../../../services/contratista-usuario.service';
import { HabEmpresaService } from '../../../../services/hab-empresa.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProyectoDisponibleDto } from '../../../../dtos/empresa.model';

@Component({
  selector: 'app-contratista-usuarios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contratista-usuarios.html',
  styleUrl: './contratista-usuarios.css',
})
export class ContratistaUsuarios implements OnInit {
  @Input() contractorId!: number;
  @Input() currentUserId: number | null = null;

  private readonly CASEVIP_ID = 572;

  usuarios: ContratistaUsuarioDto[] = [];
  proyectos: ProyectoDisponibleDto[] = [];
  loading = true;

  get esOwner(): boolean {
    if (this.currentUserId == null) return false;
    const uid = this.currentUserId;
    return this.usuarios.some((u) => u.userId === uid && u.rolNombre === 'OWNER');
  }

  constructor(
    private usuarioService: ContratistaUsuarioService,
    private habEmpresaService: HabEmpresaService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadUsuarios();
    this.loadProyectos();
  }

  loadUsuarios(): void {
    this.loading = true;
    this.usuarioService.getUsuarios(this.contractorId).subscribe({
      next: (res) => {
        this.usuarios = res ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  private loadProyectos(): void {
    this.habEmpresaService.getProyectosDisponibles(this.contractorId).subscribe({
      next: (res) => {
        this.proyectos = (res ?? []).filter((p) => p.estaActiva);
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  abrirModalInvitar(): void {
    const proyectosHtml = this.buildProyectosHtml([]);
    Swal.fire({
      title: 'Invitar usuario',
      html: this.buildFormHtml({
        email: true,
        rolNombre: '',
        scope: 'TODOS',
        proyectosHtml,
        showTipoAcceso: this.contractorId === this.CASEVIP_ID,
      }),
      showCancelButton: true,
      confirmButtonText: 'Invitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      focusConfirm: false,
      width: '420px',
      didOpen: () => this.hookScopeToggle(),
      preConfirm: () => this.preConfirmInvitar(),
    }).then((result) => {
      if (!result.isConfirmed || !result.value) return;
      this.usuarioService
        .invitar(this.contractorId, result.value as InvitarUsuarioDto)
        .subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Invitación enviada',
              timer: 1800,
              showConfirmButton: false,
            });
            this.loadUsuarios();
          },
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
    });
  }

  abrirModalEditar(u: ContratistaUsuarioDto): void {
    const proyectosHtml = this.buildProyectosHtml(u.proyectoIds ?? []);
    Swal.fire({
      title: u.nombreCompleto || u.email,
      html: this.buildFormHtml({
        email: false,
        rolNombre: u.rolNombre,
        scope: u.scope,
        proyectosHtml,
        initialScope: u.scope,
      }),
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      focusConfirm: false,
      width: '420px',
      didOpen: () => this.hookScopeToggle(),
      preConfirm: () => this.preConfirmEditar(),
    }).then((result) => {
      if (!result.isConfirmed || !result.value) return;
      this.usuarioService
        .actualizar(u.id, this.contractorId, result.value as ActualizarUsuarioDto)
        .subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
            this.loadUsuarios();
          },
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
    });
  }

  toggleActivar(u: ContratistaUsuarioDto): void {
    const accion = u.activo ? 'desactivar' : 'activar';
    Swal.fire({
      icon: 'question',
      title: `¿${u.activo ? 'Desactivar' : 'Activar'} usuario?`,
      text: `${u.nombreCompleto || u.email} será ${u.activo ? 'desactivado' : 'reactivado'}.`,
      showCancelButton: true,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: u.activo ? '#ef4444' : '#64bc04',
    }).then((result) => {
      if (!result.isConfirmed) return;
      if (u.activo) {
        this.usuarioService.desactivar(u.id, this.contractorId).subscribe({
          next: () => this.loadUsuarios(),
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
      } else {
        this.usuarioService.actualizar(u.id, this.contractorId, { activo: true }).subscribe({
          next: () => this.loadUsuarios(),
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
      }
    });
  }

  // ── Swal helpers ──────────────────────────────────────────────

  private buildProyectosHtml(selectedIds: number[]): string {
    if (!this.proyectos.length) {
      return '<p style="color:#94a3b8;font-size:0.82rem;margin:0;">Sin proyectos activos</p>';
    }
    return this.proyectos
      .map(
        (p) =>
          `<label style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:0.83rem;cursor:pointer;">
            <input type="checkbox" value="${p.id}" class="swal-proy-cb"
              ${selectedIds.includes(p.id) ? 'checked' : ''}
              style="accent-color:#64bc04;width:15px;height:15px;flex-shrink:0;">
            <span style="color:#374151;">${p.nombre}</span>
          </label>`,
      )
      .join('');
  }

  private buildFormHtml(opts: {
    email: boolean;
    rolNombre: string;
    scope: string;
    proyectosHtml: string;
    initialScope?: string;
    showTipoAcceso?: boolean;
  }): string {
    const emailField = opts.email
      ? `<div style="margin-bottom:14px;">
          <label style="${this.labelCss}">Email *</label>
          <input id="swal-email" type="email" placeholder="usuario@empresa.com"
            style="${this.inputCss}">
        </div>`
      : '';

    const rolOpts = ['ADMIN', 'GESTOR']
      .map((r) => `<option value="${r}" ${opts.rolNombre === r ? 'selected' : ''}>${r}</option>`)
      .join('');

    const scopeOpts = [
      { v: 'TODOS', l: 'Todos los proyectos' },
      { v: 'POR_PROYECTO', l: 'Por proyecto' },
    ]
      .map(
        (s) =>
          `<option value="${s.v}" ${opts.scope === s.v ? 'selected' : ''}>${s.l}</option>`,
      )
      .join('');

    const showProyectos = (opts.initialScope ?? opts.scope) === 'POR_PROYECTO';

    const tipoAccesoField = opts.showTipoAcceso
      ? `<div style="margin-bottom:14px;">
          <label style="${this.labelCss}">Tipo de acceso *</label>
          <select id="swal-system-role" style="${this.inputCss}">
            <option value="11">Acceso completo</option>
            <option value="49">Solo control de acceso</option>
          </select>
        </div>`
      : '';

    return `
      <div style="text-align:left;">
        ${emailField}
        <div style="margin-bottom:14px;">
          <label style="${this.labelCss}">Rol *</label>
          <select id="swal-rol" style="${this.inputCss}">${rolOpts}</select>
        </div>
        <div style="margin-bottom:14px;">
          <label style="${this.labelCss}">Scope *</label>
          <select id="swal-scope" style="${this.inputCss}">${scopeOpts}</select>
        </div>
        <div id="swal-proyectos-section" style="display:${showProyectos ? 'block' : 'none'};">
          <label style="${this.labelCss}">Proyectos asignados</label>
          <div style="max-height:150px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;">
            ${opts.proyectosHtml}
          </div>
        </div>
        ${tipoAccesoField}
      </div>`;
  }

  private readonly labelCss =
    'font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:5px;';
  private readonly inputCss =
    'width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:0.88rem;background:#fff;box-sizing:border-box;outline:none;';

  private hookScopeToggle(): void {
    const scopeEl = document.getElementById('swal-scope') as HTMLSelectElement | null;
    const section = document.getElementById('swal-proyectos-section') as HTMLDivElement | null;
    if (!scopeEl || !section) return;
    scopeEl.addEventListener('change', () => {
      section.style.display = scopeEl.value === 'POR_PROYECTO' ? 'block' : 'none';
    });
  }

  private getSelectedProyectoIds(): number[] {
    return Array.from(
      document.querySelectorAll<HTMLInputElement>('.swal-proy-cb:checked'),
    ).map((cb) => parseInt(cb.value, 10));
  }

  private preConfirmInvitar(): InvitarUsuarioDto | false {
    const email = (document.getElementById('swal-email') as HTMLInputElement | null)?.value.trim() ?? '';
    const rolNombre = (document.getElementById('swal-rol') as HTMLSelectElement).value;
    const scope = (document.getElementById('swal-scope') as HTMLSelectElement).value;
    if (!email) {
      Swal.showValidationMessage('El email es requerido');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Swal.showValidationMessage('Ingresa un email válido');
      return false;
    }
    const proyectoIds = scope === 'POR_PROYECTO' ? this.getSelectedProyectoIds() : undefined;
    const systemRoleEl = document.getElementById('swal-system-role') as HTMLSelectElement | null;
    const systemRoleId = systemRoleEl ? parseInt(systemRoleEl.value, 10) : 11;
    return { email, rolNombre, scope, proyectoIds, systemRoleId };
  }

  private preConfirmEditar(): ActualizarUsuarioDto {
    const rolNombre = (document.getElementById('swal-rol') as HTMLSelectElement).value;
    const scope = (document.getElementById('swal-scope') as HTMLSelectElement).value;
    const proyectoIds = scope === 'POR_PROYECTO' ? this.getSelectedProyectoIds() : [];
    return { rolNombre, scope, proyectoIds };
  }
}
