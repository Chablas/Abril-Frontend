export interface ProjectFilterDto {
  page: number;
  /** Filas por página. Sin valor, el backend usa su default (200). */
  pageSize?: number;
  ruc: string;
  razonSocial: string;
  projectDescription: string;
  /** Visible en filtros/desplegables: null trae activos e inactivos. */
  active?: boolean | null;
}
