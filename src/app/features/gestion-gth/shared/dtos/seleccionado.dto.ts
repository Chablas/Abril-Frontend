/**
 * Quién obtuvo el puesto de un requerimiento. Vive acá porque lo usan dos features del módulo,
 * cada una desde su lado del proceso: «Reclutamiento» (el detalle que ve GTH) y «Solicitud de
 * Personal» (el «Estado del reclutamiento» que ve el área solicitante). El resultado tiene que
 * quedar registrado y consultable por ambos, no solo en el correo del momento.
 */
export interface Seleccionado {
  candidatoId: number;
  /** Nombre del candidato que obtuvo el puesto. */
  nombre: string;
  /** Puesto del requerimiento (snapshot de la long list), no un dato por candidato. */
  puesto: string | null;
  /** Nombre y link del CV en SharePoint. */
  cvNombre: string | null;
  cvUrl: string | null;
  /** Momento en que el solicitante lo aprobó (ISO, ya en hora Perú). */
  seleccionadoEn: string | null;
  /** Usuario del área solicitante que tomó la decisión final. */
  seleccionadoPor: string | null;
  /** Responsable del proceso en GTH (el reclutador que llevó la vacante). */
  responsableGth: string | null;
}
