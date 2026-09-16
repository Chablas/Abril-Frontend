/**
 * Modelos de solo lectura del Centro de aprendizaje (videos y manuales) consumidos por el
 * /inicio y por el modal de /auth/login. La administración (CRUD) usa sus propios DTOs
 * dentro de la feature de Configuración.
 */

export interface LearningVideoDto {
  titulo: string;
  url: string;
  /** Miniatura opcional; si es null el front muestra un ícono genérico. */
  img?: string | null;
}

export interface LearningCategoryDto {
  id: number;
  nombre: string;
  videos: LearningVideoDto[];
}

/** Formatos de los manuales (PDF e imágenes). El backend valida los mismos al subirlos. */
export const EXTENSIONES_MANUAL = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

/**
 * ¿La tarjeta abre un manual? Lo dice la extensión del enlace: un PDF o una imagen subidos
 * guardan el link del propio archivo, mientras que un video subido guarda el del reproductor de
 * Stream y un enlace pegado a mano suele ser un video (Loom, YouTube…).
 */
export function esManual(url: string | null | undefined): boolean {
  if (!url) return false;
  let ruta: string;
  try {
    ruta = new URL(url).pathname;
  } catch {
    ruta = url.split(/[?#]/)[0];
  }
  ruta = ruta.toLowerCase();
  return EXTENSIONES_MANUAL.some((ext) => ruta.endsWith(ext));
}
