import { AreaSimpleDTO } from '../../../../../core/dtos/area/areaSimple.model';
import { ProjectSimpleDTO } from '../../../../../core/dtos/project/projectSimple.model';
import { LessonPeriodDTO } from './lessonPeriod.model';
import { UserSimpleDTO } from '../../../../../core/dtos/user/userSimple.model';

export interface LessonFiltersDTO {
  projects: ProjectSimpleDTO[];
  areas: AreaSimpleDTO[];
  periods: LessonPeriodDTO[];
  users: UserSimpleDTO[];
  /** Revisores asignados (worker_lesson_jefe_id) a los autores de las lecciones. */
  reviewers: LessonReviewerDTO[];
  /**
   * Filtros dinámicos por catalog_type — uno por cada tipo (Fase / Etapa / Nivel / …)
   * que tenga al menos un catalog_item activo en scope_item.
   */
  categories: CatalogFilterGroupDTO[];
}

/** Opción del filtro "Revisor": workerId del revisor y su nombre. */
export interface LessonReviewerDTO {
  workerId: number;
  fullName: string;
}

export interface CatalogFilterGroupDTO {
  catalogTypeId: number;
  catalogTypeName: string;
  items: CatalogFilterItemDTO[];
}

export interface CatalogFilterItemDTO {
  catalogItemId: number;
  catalogItemDescription: string;
}
