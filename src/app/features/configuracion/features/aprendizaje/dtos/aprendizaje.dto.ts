/** DTOs de administración del Centro de aprendizaje (grupos + videos y manuales). */

export interface LearningVideoAdminDto {
  id: number;
  titulo: string;
  url: string;
  img?: string | null;
  orden: number;
  activo: boolean;
  /** Nombre del archivo subido a SharePoint; null = es un enlace. */
  archivoNombre?: string | null;
}

export interface LearningCategoryAdminDto {
  id: number;
  nombre: string;
  orden: number;
  surfaceId: number;
  surfaceCode: string;
  surfaceNombre: string;
  esPublicoInterno: boolean;
  activo: boolean;
  roleIds: number[];
  videos: LearningVideoAdminDto[];
}

export interface LearningSurfaceDto {
  id: number;
  code: string;
  nombre: string;
}

export interface LearningRoleOptionDto {
  id: number;
  descripcion: string;
}

/** Todo lo que la página de administración carga en una sola petición. */
export interface LearningAdminDataDto {
  categorias: LearningCategoryAdminDto[];
  superficies: LearningSurfaceDto[];
  roles: LearningRoleOptionDto[];
}

export interface LearningCategoryCreateDto {
  nombre: string;
  surfaceId: number;
  orden: number;
  esPublicoInterno: boolean;
  roleIds: number[];
}

export type LearningCategoryEditDto = LearningCategoryCreateDto;

export interface LearningVideoCreateDto {
  categoriaId: number;
  titulo: string;
  url: string;
  img?: string | null;
  orden: number;
  /** true = va como archivo en el multipart y `url` se ignora. */
  esArchivo: boolean;
}

export interface LearningVideoEditDto {
  titulo: string;
  url: string;
  img?: string | null;
  orden: number;
  /** true sin archivo nuevo = se conserva el archivo actual. */
  esArchivo: boolean;
}
