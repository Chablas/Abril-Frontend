/**
 * DTOs de la feature Onboarding (Gestión GTH): la fase que sigue a Reclutamiento. Espejo de
 * `Features/GestionGthModule/Features/OnboardingFeature/Application/Dtos/OnboardingDtos.cs`.
 *
 * La carta oferta ya no está acá: pasó a ser el último paso de Reclutamiento y sus DTOs viven en
 * `reclutamiento/dtos/reclutamiento.dto.ts`. Lo que el onboarding hereda de ella es el file digital
 * del colaborador y la fecha de ingreso pactada.
 */

/** Todo lo que la pantalla necesita al entrar, en una sola petición. */
export interface BandejaOnboarding {
  resumen: ResumenOnboarding;
  /** Fases del catálogo en orden, con cuántos colaboradores hay parados en cada una. */
  fases: FaseOnboarding[];
  colaboradores: OnboardingListItem[];
  /**
   * Candidatos aptos para iniciar onboarding: seleccionados de requerimientos ya cerrados —o sea,
   * con su carta oferta firmada y aprobada— que todavía no tienen onboarding. Es el desplegable del
   * modal «Nuevo ingreso».
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
  /** Colaboradores parados en esta fase (es el conteo del embudo de la pantalla). */
  total: number;
  /**
   * Checklist operativo de la fase (catálogo, igual para todos los colaboradores). Viene con la
   * bandeja: es lo que dibuja el modal de detalle y de donde salen sus contadores de avance.
   */
  actividades: ActividadOnboarding[];
}

/** Una actividad obligatoria del checklist. El avance se mide en actividades, no en fases. */
export interface ActividadOnboarding {
  actividadId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  /** true = la cumple el sistema solo, sin acción de GTH (avisos preventivos de la solicitud). */
  automatica: boolean;
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
  /** Avance en % medido en actividades del checklist (no en fases). Lo calcula el backend. */
  avancePorcentaje: number;
  /**
   * Códigos de las actividades del checklist ya cumplidas por este colaborador. Es el único origen
   * de los checks del detalle: la pantalla no deduce nada por su cuenta.
   */
  actividadesHechas: string[];

  /** Carpeta de SharePoint donde vive el file digital del colaborador. */
  fileDigitalCarpeta: string | null;

  observacion: string | null;
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
  /** Correo personal del colaborador (el de su ficha de la base maestra). */
  correo: string | null;
  jefeDirecto: string | null;
  /**
   * Fecha de ingreso pactada en su carta oferta. Prellena el modal: GTH la puede ajustar si el
   * ingreso se movió entre la firma y la apertura del onboarding.
   */
  fechaIngreso: string | null;
  /** Carpeta del file digital que abrió su carta oferta. El onboarding la hereda tal cual. */
  fileDigitalCarpeta: string | null;
}

/** Datos del modal «Nuevo ingreso». */
export interface OnboardingCreate {
  candidatoId: number;
  /** Si no viaja, se usa la que quedó pactada en la carta oferta. */
  fechaIngreso: string | null;
  observacion: string | null;
}

export interface OnboardingCreateResult {
  onboardingId: number;
  message: string;
  colaborador: OnboardingListItem | null;
}

/** Resultado de avanzar de fase: la fila ya actualizada. */
export interface OnboardingAccionResult {
  message: string;
  colaborador: OnboardingListItem | null;
}
