import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { ProjectDto } from './project.dto';

/** Una fila de los catálogos project_tipo y project_ciclo_vida. */
export interface ProjectCatalogoDto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
}

/**
 * Carga inicial de Configuración → Proyectos (GET project/init): los catálogos de los filtros y de
 * los modales, y la primera página. Los cambios de filtro y de página piden solo la página.
 */
export interface ProjectInitDto {
  tipos: ProjectCatalogoDto[];
  ciclosVida: ProjectCatalogoDto[];
  proyectos: PagedResponseDTO<ProjectDto>;
}
