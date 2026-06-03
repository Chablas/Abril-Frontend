import { AreaSimpleDTO } from '../../../../../core/dtos/area/areaSimple.model';
import { ProjectSimpleDTO } from '../../../../../core/dtos/project/projectSimple.model';
import { LessonPeriodDTO } from './lessonPeriod.model';
import { UserSimpleDTO } from '../../../../../core/dtos/user/userSimple.model';

export interface LessonFiltersDTO {
  projects: ProjectSimpleDTO[];
  areas: AreaSimpleDTO[];
  periods: LessonPeriodDTO[];
  users: UserSimpleDTO[];
  /**
   * Filtros dinámicos por catalog_type — uno por cada tipo (Fase / Etapa / Nivel / …)
   * que tenga al menos un catalog_item activo en scope_item.
   */
  categories: CatalogFilterGroupDTO[];
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
