/**
 * DTOs de Configuración → Razones Sociales. Espejo de
 * `Features/ConfigurationModule/Features/RazonSocialFeature/Application/Dtos/RazonSocialDtos.cs`.
 *
 * El catálogo de empresas de SSOMA (`CatalogosSaludService.getEmpresas`) lee la misma tabla, pero
 * con otro shape: allá solo hace falta el nombre y el RUC para llenar un desplegable.
 */

export interface RazonSocial {
  id: number;
  nombre: string | null;
  ruc: string | null;
  direccion: string | null;
  partidaRegistral: string | null;
  tipoActividad: string | null;
  activo: boolean;
  /** true = empresa del grupo Abril (no un contratista ni un proveedor). */
  esAbril: boolean;
  /** Banco con el que trabaja. Solo lo tienen las del grupo. */
  bancoId: number | null;
  bancoNombre: string | null;
  /**
   * Trabajadores que hoy están en Abril bajo esta razón social y que le consumen cupo del tope de
   * 20 que aplica Reclutamiento: es el mismo número, a propósito. No es el histórico ni la
   * planilla completa — quedan fuera los retirados y las fichas de pre-ingreso
   * (`workers_estado.esta_adentro`), el personal de Obra y los practicantes. Solo el conteo —
   * quiénes son se piden al abrir el detalle, ver `RazonSocialTrabajador`.
   */
  cantidadTrabajadores: number;
}

/**
 * Fila del detalle «trabajadores de esta razón social». Es una ficha de `workers`, no una persona:
 * quien reingresó tiene más de una y las dos salen si ambas apuntan a esta razón social — a
 * propósito, para que la lista cuadre con `cantidadTrabajadores`.
 */
export interface RazonSocialTrabajador {
  workerId: number;
  nombreCompleto: string;
  emailCorporativo: string | null;
  /**
   * Tipo de ubicación del trabajador (catálogo `workers_obra_oficina_staff`): Obra, Staff,
   * Oficina Central o Personal Externo. No confundir con la ubicación de trabajo del formulario
   * de onboarding, que es otro catálogo. `null` en las fichas que nunca lo tuvieron cargado.
   */
  tipoUbicacionId: number | null;
  tipoUbicacionNombre: string | null;
}

/** Una opción del desplegable «Banco». */
export interface BancoOpcion {
  id: number;
  nombre: string;
}

/** Carga inicial de la pantalla: tabla + catálogo de bancos, en una sola petición. */
export interface RazonSocialBandeja {
  razonesSociales: RazonSocial[];
  bancos: BancoOpcion[];
}

/** Alta. Los datos de identidad salen de la consulta a SUNAT. */
export interface RazonSocialCreate {
  ruc: string;
  nombre: string;
  direccion: string;
  tipoActividad: string;
  distrito: string;
  provincia: string;
  departamento: string;
  partidaRegistral?: string | null;
  esAbril: boolean;
  bancoId: number | null;
}

/** Edición. El RUC, el nombre y la partida registral vienen de SUNAT y no se editan. */
export interface RazonSocialUpdate {
  direccion: string | null;
  tipoActividad: string | null;
  activo: boolean;
  esAbril: boolean;
  bancoId: number | null;
}

/** Respuesta de la consulta de RUC a SUNAT. */
export interface SunatContributor {
  contributorRuc: string;
  contributorName: string;
  contributorAddress: string;
  contributorEconomicActivityDescription: string;
  contributorDistrict?: string | null;
  contributorProvince?: string | null;
  contributorDepartment?: string | null;
}
