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
