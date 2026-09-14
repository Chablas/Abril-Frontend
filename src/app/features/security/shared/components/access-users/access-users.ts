import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { AccessPanel } from '../access-panel/access-panel';
import { AccessUserDto } from '../../dtos/access.dto';

/**
 * Usuarios con acceso, en los detalles de Seguridad. Cuando llegan con `viaRoles` (detalle de una
 * funcionalidad) cada fila dice por qué roles accede, y el buscador también encuentra por rol.
 */
@Component({
  selector: 'app-access-users',
  standalone: true,
  imports: [CommonModule, AccessPanel, TitleCasePipe],
  templateUrl: './access-users.html',
  styleUrl: './access-users.css',
})
export class AccessUsers implements OnChanges {
  @Input() users: AccessUserDto[] = [];
  @Input() titulo = 'Usuarios';
  @Input() vacio = 'Ningún usuario.';
  @Input() cargando = false;

  filtrados: AccessUserDto[] = [];
  conVia = false;
  private termino = '';

  ngOnChanges(): void {
    this.conVia = this.users.some((u) => (u.viaRoles?.length ?? 0) > 0);
    this.filtrar();
  }

  buscar(termino: string): void {
    this.termino = termino;
    this.filtrar();
  }

  trackById(_: number, u: AccessUserDto): number {
    return u.userId;
  }

  private filtrar(): void {
    const termino = this.termino.trim();
    this.filtrados = termino
      ? this.users.filter((u) => SearchInput.matches(this.textoBuscable(u), termino))
      : this.users;
  }

  private textoBuscable(u: AccessUserDto): string {
    return [u.displayName ?? '', u.email, ...(u.viaRoles ?? []).map((r) => r.roleDescription)].join(' ');
  }
}
