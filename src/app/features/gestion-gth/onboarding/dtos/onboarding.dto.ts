/**
 * DTOs de la feature Onboarding (Gestión GTH): la fase que sigue a Reclutamiento. Espejo de
 * `Features/GestionGthModule/Features/OnboardingFeature/Application/Dtos/OnboardingDtos.cs`.
 *
 * La carta oferta ya no está acá: pasó a ser el último paso de Reclutamiento y sus DTOs viven en
 * `reclutamiento/dtos/reclutamiento.dto.ts`. Lo que el onboarding hereda de ella es el file digital
 * del colaborador y la fecha de ingreso pactada.
 */

/**
 * Todo lo que la pantalla necesita al entrar, en una sola petición.
 *
 * Ya no viajan «candidatos aptos»: el que termina reclutamiento entra solo a la lista, así que no
 * hay desplegable que llenar ni alta manual que hacer.
 */
export interface BandejaOnboarding {
  resumen: ResumenOnboarding;
  /** Fases del catálogo en orden, con cuántos colaboradores hay parados en cada una. */
  fases: FaseOnboarding[];
  colaboradores: OnboardingListItem[];
}

export interface ResumenOnboarding {
  ingresosDelMes: number;
  enProceso: number;
  completos: number;
  colaboradoresNuevos: number;
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

  // ── Aviso al responsable de obra (fase «Correo de bienvenida») ─────────────

  /**
   * false cuando este ingreso no lleva ese aviso: a Oficina Central no hay obra que avisarle, y un
   * proyecto sin coordinador administrativo no tiene a quién escribirle.
   */
  avisoObraAplica: boolean;
  /** Por qué no aplica; null cuando sí aplica. */
  avisoObraMotivoNoAplica: string | null;
  /** Coordinador administrativo del proyecto: el destinatario del aviso. */
  avisoObraDestinatario: string | null;
  avisoObraEmail: string | null;
  /** Cuándo salió el aviso. null = todavía no. */
  avisoObraEnviadoEn: string | null;

  // ── Correo de bienvenida y formulario del colaborador ─────────────────────

  /** Cuándo salió el correo de bienvenida. null = todavía no. */
  bienvenidaEnviadaEn: string | null;
  /**
   * Buzón al que salió (o al que saldría): el correo personal de su ficha maestra. null cuando esa
   * ficha no tiene correo, que es lo único que impide mandar la bienvenida.
   */
  bienvenidaEmail: string | null;
  /** Hasta cuándo tiene el colaborador para completar su formulario. */
  formularioFechaLimite: string | null;
  /** Cuándo envió su formulario. null = todavía no lo mandó. */
  formularioCompletadoEn: string | null;
}

/** Resultado de avanzar de fase: la fila ya actualizada. */
export interface OnboardingAccionResult {
  message: string;
  colaborador: OnboardingListItem | null;
}
