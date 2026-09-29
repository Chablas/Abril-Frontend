export interface ProjectFilterDto {
  page: number;
  /** Filas por página. Sin valor, el backend usa su default (200). */
  pageSize?: number;
  ruc: string;
  razonSocial: string;
  projectDescription: string;
  /** Visible en filtros/desplegables: null trae activos e inactivos. */
  active?: boolean | null;
  /** Catálogo project_tipo: null trae todos. */
  projectTipoId?: number | null;
  /** Catálogo project_ciclo_vida: null trae todos. */
  projectCicloVidaId?: number | null;
}
