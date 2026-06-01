import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AreaScopeService } from '../../services/area-scope.service';
import { AreaScopeTreeDto } from '../../dtos/areaScope.model';
import { AreaScopeBranch } from './area-scope-branch';

interface BranchSegment {
  name: string;
  areaTypeName: string;
}

interface BranchRow {
  leafScopeId: number;
  segments: BranchSegment[];
}

@Component({
  selector: 'app-area-scope-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AreaScopeBranch],
  templateUrl: './area-scope-list.html',
})
export class AreaScopeList implements OnInit {
  rows: BranchRow[] = [];
  showBranchModal = false;

  constructor(
    private service: AreaScopeService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getTree().subscribe({
      next: (tree) => {
        this.rows = this.computeBranches(tree);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Recorre el árbol y devuelve una fila por cada hoja con su path completo. */
  private computeBranches(tree: AreaScopeTreeDto[]): BranchRow[] {
    const result: BranchRow[] = [];
    const walk = (node: AreaScopeTreeDto, ancestors: BranchSegment[]) => {
      const segments = [...ancestors, { name: node.areaItemName, areaTypeName: node.areaTypeName }];
      if (!node.children?.length) {
        result.push({ leafScopeId: node.areaScopeId, segments });
        return;
      }
      for (const child of node.children) walk(child, segments);
    };
    for (const root of tree) walk(root, []);
    return result;
  }

  openCreateBranch(): void {
    this.showBranchModal = true;
  }

  onBranchSaved(): void {
    this.showBranchModal = false;
    this.load();
  }

  delete(row: BranchRow): void {
    const path = row.segments.map((s) => s.name).join(' > ');
    Swal.fire({
      title: '¿Eliminar esta relación?',
      html: `Se eliminará la última área de la rama: <b>${path}</b>.<br/><br/>` +
        `Si la rama tiene otros hijos en otras ramas, esos no se verán afectados.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#64BC04',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Eliminar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.delete(row.leafScopeId).subscribe({
        next: (res) => {
          this.loaderService.hide();
          this.load();
          Swal.fire({
            title: '¡Eliminado!',
            text: res.message ?? 'La relación ha sido eliminada.',
            icon: 'success',
            confirmButtonColor: '#64BC04',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }
}
