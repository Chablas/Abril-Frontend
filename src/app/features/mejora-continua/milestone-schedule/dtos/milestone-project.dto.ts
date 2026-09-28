/** Tarjeta del listado del Cronograma de Hitos (GET project/paged-with-residents). */
export interface MilestoneProjectDto {
  projectId: number;
  projectDescription: string;
  levelDescription?: string | null;
  fotoUrl?: string | null;
  /** Residente del proyecto según Configuración → Proyectos → Emails SSOMA. */
  residenteNombre?: string | null;
  /** true si el usuario logueado es ese residente (lo calcula el backend). */
  esResidenteDelProyecto: boolean;
}

export interface MilestoneProjectPagedDto {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: MilestoneProjectDto[];
}
