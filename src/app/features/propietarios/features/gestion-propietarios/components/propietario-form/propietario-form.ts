import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { GestionPropietariosService } from '../../services/gestion-propietarios.service';
import {
  PropiedadGuardarDto,
  PropietarioGuardadoDto,
  PropietarioListItemDto,
  PropietarioPersonaDto,
  PropietarioProyectoDto,
  PropietarioUpdateDto,
} from '../../dtos/propietario.dto';

interface FilaPropiedad {
  propietarioId: number | null;
  projectId: number | null;
  torre: string;
  departamento: string;
}

const DNI_VALIDO = /^\d{8}$/;

/**
 * Crear y editar un propietario en un solo modal: sus datos, la cuenta de la app y sus
 * propiedades, con un solo Guardar. Al crear no se elige rol: el backend le da PROPIETARIO.
 */
@Component({
  standalone: true,
  selector: 'app-propietario-form',
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './propietario-form.html',
})
export class PropietarioForm implements OnInit {
  /** null = crear. */
  @Input() propietario: PropietarioListItemDto | null = null;
  @Input() proyectos: PropietarioProyectoDto[] = [];
  @Output() closeModal = new EventEmitter<void>();
  /** true si se creó uno nuevo. */
  @Output() saved = new EventEmitter<boolean>();

  dni = '';
  firstNames = '';
  firstLastName = '';
  secondLastName = '';
  email = '';
  phoneNumber: number | null = null;
  propiedades: FilaPropiedad[] = [];

  /** Los proyectos del filtro más los de sus propiedades que ya no se ven en los desplegables. */
  opcionesProyecto: PropietarioProyectoDto[] = [];

  /** Ya tiene usuario con otros roles (o de Abril): el correo se cambia desde Seguridad → Usuarios. */
  correoBloqueado = false;
  /** La persona ya existe en el sistema con nombres: el backend no los pisa al crear. */
  nombresBloqueados = false;
  /** Fondo de los campos de solo lectura (la clase global abril-field-input le gana a Tailwind). */
  readonly soloLectura = '#F3F4F6';
  /** Resultado de la lupa para el DNI que está escrito (se descarta si cambia el DNI). */
  private personaBuscada: PropietarioPersonaDto | null = null;

  constructor(
    private service: GestionPropietariosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  get esNuevo(): boolean {
    return this.propietario == null;
  }

  get titulo(): string {
    return this.esNuevo ? 'CREAR PROPIETARIO' : 'EDITAR PROPIETARIO';
  }

  ngOnInit(): void {
    const p = this.propietario;
    this.opcionesProyecto = [...this.proyectos];

    if (!p) {
      this.agregarPropiedad();
      return;
    }

    this.dni = p.dni ?? '';
    this.firstNames = p.firstNames ?? '';
    this.firstLastName = p.firstLastName ?? '';
    this.secondLastName = p.secondLastName ?? '';
    this.email = p.email ?? '';
    this.phoneNumber = p.phoneNumber;
    this.correoBloqueado = p.userId != null && !p.soloPropietario;

    this.propiedades = p.propiedades.map((pr) => ({
      propietarioId: pr.propietarioId,
      projectId: pr.projectId,
      torre: pr.torre ?? '',
      departamento: pr.departamento,
    }));
    if (this.propiedades.length === 0) this.agregarPropiedad();

    for (const pr of p.propiedades) {
      if (!this.opcionesProyecto.some((o) => o.projectId === pr.projectId)) {
        this.opcionesProyecto.push({ projectId: pr.projectId, projectDescription: pr.proyecto });
      }
    }
    this.opcionesProyecto.sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
  }

  agregarPropiedad(): void {
    this.propiedades.push({ propietarioId: null, projectId: null, torre: '', departamento: '' });
  }

  quitarPropiedad(index: number): void {
    this.propiedades.splice(index, 1);
  }

  /** Un DNI distinto al buscado deja sin efecto lo que trajo la lupa. */
  onDniChange(): void {
    if (this.personaBuscada) {
      this.personaBuscada = null;
      this.correoBloqueado = false;
      this.nombresBloqueados = false;
    }
  }

  /** Lupa: primero el sistema (la persona puede existir por GTH o Seguridad) y si no, RENIEC. */
  buscarDni(): void {
    const dni = this.dni.trim();
    if (!DNI_VALIDO.test(dni)) {
      Swal.fire({ icon: 'warning', title: 'DNI incompleto', text: 'El DNI debe tener 8 dígitos.' });
      return;
    }

    this.loaderService.show();
    this.service.buscarPersona(dni).subscribe({
      next: (persona) => {
        this.loaderService.hide();
        this.personaBuscada = persona;

        if (persona.yaEsPropietario) {
          Swal.fire({ icon: 'warning', title: 'Ya está en la lista', text: 'Edítalo desde la tabla.' });
          return;
        }
        if (persona.fuente === 'NINGUNA') {
          Swal.fire({ icon: 'warning', title: 'DNI no encontrado', text: 'No está en el sistema ni en RENIEC.' });
          return;
        }

        this.firstNames = persona.firstNames ?? '';
        this.firstLastName = persona.firstLastName ?? '';
        this.secondLastName = persona.secondLastName ?? '';
        if (persona.email) this.email = persona.email;
        if (persona.phoneNumber) this.phoneNumber = persona.phoneNumber;

        this.nombresBloqueados = persona.fuente === 'SISTEMA' && !!persona.firstNames;
        this.correoBloqueado = persona.tieneUsuario;
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private camposFaltantes(): string[] {
    const faltan: string[] = [];
    if (this.esNuevo && !DNI_VALIDO.test(this.dni.trim())) faltan.push('DNI (8 dígitos)');
    if (!this.firstNames.trim()) faltan.push('Nombres');
    if (!this.firstLastName.trim()) faltan.push('Primer apellido');
    if (!this.email.trim()) faltan.push('Correo');
    if (this.propiedades.length === 0) faltan.push('Al menos una propiedad');
    if (this.propiedades.some((f) => f.projectId == null)) faltan.push('Proyecto de cada propiedad');
    if (this.propiedades.some((f) => !f.departamento.trim())) faltan.push('Departamento de cada propiedad');
    return faltan;
  }

  guardar(): void {
    const faltan = this.camposFaltantes();
    if (faltan.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        html: `<ul style="text-align:left;padding-left:1.4rem;line-height:2">${faltan
          .map((f) => `<li>${f}</li>`)
          .join('')}</ul>`,
      });
      return;
    }

    if (this.esNuevo && this.personaBuscada?.yaEsPropietario) {
      Swal.fire({ icon: 'warning', title: 'Ya está en la lista', text: 'Edítalo desde la tabla.' });
      return;
    }

    const propiedades: PropiedadGuardarDto[] = this.propiedades.map((f) => ({
      propietarioId: f.propietarioId,
      projectId: f.projectId!,
      torre: f.torre.trim() || null,
      departamento: f.departamento.trim(),
    }));

    const datos: PropietarioUpdateDto = {
      firstNames: this.firstNames.trim(),
      firstLastName: this.firstLastName.trim(),
      secondLastName: this.secondLastName.trim() || null,
      email: this.email.trim(),
      phoneNumber: this.phoneNumber || null,
      propiedades,
    };

    const peticion = this.esNuevo
      ? this.service.crear({ dni: this.dni.trim(), ...datos })
      : this.service.actualizar(this.propietario!.personId, datos);

    this.loaderService.show();
    peticion.subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.avisarGuardado(res);
        this.saved.emit(this.esNuevo);
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** El correo de invitación lo manda el backend: el aviso dice a qué dirección fue. */
  private avisarGuardado(res: PropietarioGuardadoDto): void {
    const title = this.esNuevo ? 'Propietario creado' : 'Propietario actualizado';

    if (res.invitacionFallida) {
      Swal.fire({
        icon: 'warning',
        title,
        text: 'No se pudo enviar la invitación a la app. Reenvíala desde la tabla.',
      });
      return;
    }

    Swal.fire({
      icon: 'success',
      title,
      text: res.invitacionEnviadaA ? `Invitación a la app enviada a ${res.invitacionEnviadaA}.` : undefined,
    });
  }
}
