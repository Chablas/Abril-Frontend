/**
 * DTOs de la feature Onboarding (Gestión GTH): la fase que sigue a Reclutamiento. Espejo de
 * `Features/GestionGthModule/Features/OnboardingFeature/Application/Dtos/OnboardingDtos.cs`.
 */

/** Todo lo que la pantalla necesita al entrar, en una sola petición. */
export interface BandejaOnboarding {
  resumen: ResumenOnboarding;
  /** Fases del catálogo en orden, con cuántos colaboradores hay parados en cada una. */
  fases: FaseOnboarding[];
  colaboradores: OnboardingListItem[];
  /**
   * Candidatos aptos para iniciar onboarding: seleccionados de requerimientos ya cerrados que
   * todavía no tienen onboarding. Es el desplegable del modal «Nuevo ingreso».
   */
  candidatosAptos: CandidatoApto[];
}

export interface ResumenOnboarding {
  ingresosDelMes: number;
  enProceso: number;
  completos: number;
  colaboradoresNuevos: number;
  candidatosPorIngresar: number;
}

export interface FaseOnboarding {
  faseId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  total: number;
}

/** Una fila de la tabla «Colaboradores ingresados». */
export interface OnboardingListItem {
  onboardingId: number;
  candidatoId: number;
  personId: number | null;
  /** Código del requerimiento que originó la contratación (REQ-AAAA-NNNN). */
  codigo: string;
  nombre: string;
  puesto: string | null;
  area: string | null;
  empresa: string | null;
  proyectoObra: string | null;
  fechaIngreso: string | null;
  jefeDirecto: string | null;
  correo: string | null;
  faseCodigo: string;
  faseNombre: string;
  faseOrden: number;
  estadoCodigo: string;
  estadoNombre: string;
  /** Avance en % (fase actual sobre el total de fases del catálogo). */
  avancePorcentaje: number;
  cartaOfertaNombre: string | null;
  cartaOfertaUrl: string | null;
  cartaOfertaEnviadaEn: string | null;
  iniciadoEn: string | null;
}

/** Una opción del desplegable del modal «Nuevo ingreso». */
export interface CandidatoApto {
  candidatoId: number;
  requerimientoId: number;
  personId: number | null;
  nombre: string;
  codigo: string;
  puesto: string | null;
  area: string | null;
  empresa: string | null;
  proyectoObra: string | null;
  /**
   * Correo personal al que iría la carta oferta. Lo resuelve el backend desde la base de datos
   * (`person.email`, lo que GTH validó al aprobar el formulario del postulante). Null = no hay a
   * dónde enviar y el modal bloquea el envío.
   */
  correo: string | null;
  fechaRequeridaIngreso: string | null;
  jefeDirecto: string | null;
}

/** Datos del modal «Nuevo ingreso» (van como JSON en el multipart; la carta va como archivo). */
export interface OnboardingCreate {
  candidatoId: number;
  fechaIngreso: string | null;
  /** Solo se manda si GTH corrigió a mano el correo que resolvió el backend. */
  correo: string | null;
  observacion: string | null;
}

export interface OnboardingCreateResult {
  onboardingId: number;
  message: string;
  colaborador: OnboardingListItem | null;
}
