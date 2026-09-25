// Autoguardado de borradores + historial de versiones, ambos 100% locales (localStorage).
// No hay tabla nueva en el backend: esto es una red de seguridad para no perder trabajo
// por un refresh/cierre accidental de pestaña, y para poder volver a una versión anterior
// de la misma pantalla sin depender de que el usuario haya guardado explícitamente cada vez.

const PREFIJO_BORRADOR = 'cursos_borrador_';
const PREFIJO_HISTORIAL = 'cursos_historial_';
const MAX_VERSIONES = 20;

export interface BorradorGuardado<T> {
  guardadoEn: number; // epoch ms
  datos: T;
}

export interface VersionGuardada {
  guardadoEn: number;
  configuracionJson: string;
  tipoCodigo: string;
}

export function claveBorrador(cursoId: number, slideId: number | null, orden: number): string {
  return `${PREFIJO_BORRADOR}${cursoId}_${slideId ?? `nueva-${orden}`}`;
}

export function claveHistorial(cursoId: number, slideId: number): string {
  return `${PREFIJO_HISTORIAL}${cursoId}_${slideId}`;
}

export function guardarBorrador<T>(clave: string, datos: T): void {
  try {
    const entrada: BorradorGuardado<T> = { guardadoEn: Date.now(), datos };
    localStorage.setItem(clave, JSON.stringify(entrada));
  } catch {
    // localStorage puede fallar (modo privado, cuota llena, SSR) — el autoguardado es
    // una comodidad, no una garantía; si falla, simplemente no hay red de seguridad esta vez.
  }
}

export function leerBorrador<T>(clave: string): BorradorGuardado<T> | null {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as BorradorGuardado<T>) : null;
  } catch {
    return null;
  }
}

export function borrarBorrador(clave: string): void {
  try {
    localStorage.removeItem(clave);
  } catch {
    // ver comentario en guardarBorrador
  }
}

export function agregarVersion(clave: string, version: Omit<VersionGuardada, 'guardadoEn'>): void {
  try {
    const lista = listarVersiones(clave);
    lista.unshift({ ...version, guardadoEn: Date.now() });
    localStorage.setItem(clave, JSON.stringify(lista.slice(0, MAX_VERSIONES)));
  } catch {
    // ver comentario en guardarBorrador
  }
}

export function listarVersiones(clave: string): VersionGuardada[] {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as VersionGuardada[]) : [];
  } catch {
    return [];
  }
}
