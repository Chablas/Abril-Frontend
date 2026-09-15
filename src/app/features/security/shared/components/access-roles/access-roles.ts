import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { AccessPanel } from '../access-panel/access-panel';
import { AccessRoleDto } from '../../dtos/access.dto';

/** Roles de un detalle de Seguridad, cada uno con cuántos usuarios lo tienen y cuántas funcionalidades da. */
@Component({
  selector: 'app-access-roles',
  standalone: true,
  imports: [CommonModule, AccessPanel],
  templateUrl: './access-roles.html',
  styleUrl: './access-roles.css',
})
export class AccessRoles implements OnChanges {
  @Input() roles: AccessRoleDto[] = [];
  @Input() titulo = 'Roles';
  @Input() vacio = 'Ningún rol.';
  @Input() cargando = false;

  filtrados: AccessRoleDto[] = [];
  private termino = '';

  ngOnChanges(): void {
    this.filtrar();
  }

  buscar(termino: string): void {
    this.termino = termino;
    this.filtrar();
  }

  trackById(_: number, r: AccessRoleDto): number {
    return r.roleId;
  }

  private filtrar(): void {
    const termino = this.termino.trim();
    this.filtrados = termino
      ? this.roles.filter((r) => SearchInput.matches(r.roleDescription, termino))
      : this.roles;
  }
}
