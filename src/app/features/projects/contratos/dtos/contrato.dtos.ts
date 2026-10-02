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
  /** Contributor directo (razón social o persona con RUC), no el Contractor del portal de
   *  subcontratistas de obra. Se obtiene con GET api/v1/project/company-lookup/{ruc}. */
  contributorId: number;
  /** Razón social del contributor (el backend mantiene el nombre "contractorName"). */
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
  contributorId: number;
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

/** Igual que el de creación, sin projectId/contributorId/workSpecialtyId (no se pueden cambiar). */
export type ProjectContractEditDTO = Omit<
  ProjectContractCreateDTO,
  'projectId' | 'contributorId' | 'workSpecialtyId'
>;

export interface ProjectContractCreatedDTO {
  projectContractId: number;
  /** El backend asigna el N° (correlativo por proyecto) al crear, pero hoy no lo devuelve acá. */
  contractNumber?: number | null;
  message: string;
}

/** POST /{id}/hitos. Responde la lista completa de hitos del contrato, ya recalculada. */
export interface ProjectContractMilestoneCreateDTO {
  description: string;
  percentage: number;
  paidDate?: string | null;
  chequeRecibo?: string | null;
  observation?: string | null;
}

/** PATCH /hitos/{id}/pago. Responde el hito actualizado. Se permite en cualquier estado. */
export interface ProjectContractMilestonePaymentDTO {
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

/** Paso 7: POST /{id}/paso7-escaneo/{slot} (multipart, campo `file`). Slot 1, 2 o 3; volver a
 *  subir en el mismo slot reemplaza el archivo. Exige la carpeta de SharePoint del proyecto. */
export interface ProjectContractScannedDocDTO {
  projectContractScannedDocId?: number;
  slot: number;
  fileUrl?: string | null;
  originalFileName?: string | null;
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

// ── Contratista (búsqueda por RUC) ───────────────────────────────────────────
// GET api/v1/project/company-lookup/{ruc} — el mismo de Configuración → Proyectos (razón social
// del proyecto). Busca en Sunat y, si el RUC no existe en el sistema, crea el Contributor
// (persona natural 10xxxxxxxxx o empresa 20xxxxxxxxx). 404 si el RUC no existe ni en Sunat.
export interface ContributorLookupDTO {
  contributorId: number;
  contributorRuc: string;
  contributorName: string;
  contributorAddress: string;
  contributorDistrict?: string | null;
  contributorProvince?: string | null;
  contributorDepartment?: string | null;
  legalEntityRegistryNumber?: string | null;
}

// ── Catálogos ────────────────────────────────────────────────────────────────
// No hay endpoint propio de catálogos para Contratos: se reutiliza el mismo
// `GET api/v1/projectSubContractor/form-data` de Adjudicaciones (solo [Authorize], sin
// featureKey), que ya devuelve proyectos activos, monedas activas y especialidades activas
// (excluye las inactivas, p. ej. IIMM y OBRAS PROVISIONALES). Acá solo se tipa la parte que
// se usa. Sus "contributors" NO sirven para Contratos: son los subcontratistas de obra
// homologados por Costos; los consultores de diseño se buscan por RUC (ContributorLookupDTO).

export interface ContratoProyectoOption {
  projectId: number;
  projectDescription: string;
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
  currencies: ContratoMonedaOption[];
  workSpecialties: ContratoEspecialidadOption[];
}

export interface ApiMessage {
  message: string;
}
