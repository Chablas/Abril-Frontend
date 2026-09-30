// DTOs de Contratos de Unidad de Proyectos — alineados campo a campo con
// Abril_Backend/Features/UnidadDeProyectosModule/Features/ContratosFeature/Application/Dtos/ProjectContractDtos.cs
// (base `api/v1/projectcontract`). Fechas DateOnly del backend viajan como "YYYY-MM-DD".

export interface ProjectContractMilestoneDTO {
  projectContractMilestoneId: number;
  projectContractId: number;
  order: number;
  description: string;
  percentage: number;
  /** Calculado por el backend: percentage / 100 * amount del contrato. */
  amount: number;
  paidDate?: string | null;
  chequeRecibo?: string | null;
  observation?: string | null;
  /** true solo en el último hito por order (el que la cláusula de garantías del contrato referencia). */
  esHitoDeGarantia: boolean;
}

export interface ProjectContractDTO {
  projectContractId: number;
  projectId: number;
  contractorId: number;
  contractorName?: string | null;
  workSpecialtyId: number;
  workSpecialtyDescription?: string | null;
  /** 1-9, ver CONTRATO_PASOS. */
  projectContractStatusId: number;
  projectContractStatusDescription?: string | null;
  contractNumber?: number | null;
  serviceDescription?: string | null;
  amount: number;
  currencyId: number;
  currencyCode?: string | null;
  contractorEmail?: string | null;
  signingDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  termDays?: number | null;
  detalleServicios?: string | null;
  createdDateTime: string;
  active: boolean;
  /** Vacío en el listado (GET ?projectId=); solo el detalle (GET /{id}) trae los hitos. */
  milestones: ProjectContractMilestoneDTO[];

  // Pasos 4-9
  contractorNotificationSkipped: boolean;
  arrivedWithObservations?: boolean | null;
  arrivalObservation?: string | null;
  step6SignedJefeProyectos: boolean;
  step6SignedGerenteInmobiliario: boolean;
  step6SignedGerenteGeneral: boolean;
}

export interface ProjectContractCreateDTO {
  projectId: number;
  contractorId: number;
  workSpecialtyId: number;
  serviceDescription?: string | null;
  amount: number;
  currencyId: number;
  contractorEmail?: string | null;
  signingDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  termDays?: number | null;
  detalleServicios?: string | null;
}

/** Igual que el de creación, sin projectId/contractorId/workSpecialtyId (no se pueden cambiar). */
export type ProjectContractEditDTO = Omit<
  ProjectContractCreateDTO,
  'projectId' | 'contractorId' | 'workSpecialtyId'
>;

export interface ProjectContractCreatedDTO {
  projectContractId: number;
  message: string;
}

export interface ProjectContractMilestoneCreateDTO {
  description: string;
  percentage: number;
  paidDate?: string | null;
  chequeRecibo?: string | null;
  observation?: string | null;
}

export interface ProjectContractStep5ArrivalDTO {
  arrivedWithObservations: boolean;
  arrivalObservation?: string | null;
}

export interface ProjectContractStep6SignaturesDTO {
  step6SignedJefeProyectos: boolean;
  step6SignedGerenteInmobiliario: boolean;
  step6SignedGerenteGeneral: boolean;
}

// ── Configuración: carpeta de SharePoint (por proyecto) ──────────────────────
export interface ProjectContractFolderDTO {
  projectContractFolderId: number;
  projectId: number;
  linkUrl: string;
  folderName?: string | null;
  webUrl?: string | null;
}

export interface ProjectContractFolderSaveDTO {
  linkUrl: string;
}

// ── Catálogos ────────────────────────────────────────────────────────────────
// No hay endpoint propio de catálogos para Contratos: se reutiliza el mismo
// `GET api/v1/projectSubContractor/form-data` de Adjudicaciones (solo [Authorize], sin
// featureKey), que ya devuelve proyectos activos, contratistas homologados (con sus
// correos), monedas activas y especialidades activas (excluye las inactivas, p. ej. IIMM
// y OBRAS PROVISIONALES). Acá solo se tipa la parte de esa respuesta que se usa.

export interface ContratoProyectoOption {
  projectId: number;
  projectDescription: string;
}

export interface ContratoContratistaOption {
  contractorId: number;
  contributorId: number;
  contributorName: string;
  contributorRuc: string;
  emails: string[];
}

export interface ContratoMonedaOption {
  currencyId: number;
  currencyCode: string;
  currencyDescription: string;
  currencySymbol: string;
}

export interface ContratoEspecialidadOption {
  workSpecialtyId: number;
  workSpecialtyDescription: string;
}

export interface ContratoCatalogosDTO {
  projects: ContratoProyectoOption[];
  contributors: ContratoContratistaOption[];
  currencies: ContratoMonedaOption[];
  workSpecialties: ContratoEspecialidadOption[];
}

export interface ApiMessage {
  message: string;
}
