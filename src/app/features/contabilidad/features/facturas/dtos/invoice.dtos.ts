export interface InvoiceDto {
  invoiceId: number;
  issueDate: string;
  invoiceNumber: string;
  contributorId: number;
  contributorRuc: string;
  contributorName: string;
  description: string;
  invoicePaymentFormId: number;
  invoicePaymentFormDescription: string;
  total: number;
  documentUrl?: string | null;
  createdDateTime: string;
}

export interface InvoiceSupplierDto {
  contributorId: number;
  contributorRuc: string;
  contributorName: string;
}

export interface InvoicePaymentFormDto {
  invoicePaymentFormId: number;
  invoicePaymentFormDescription: string;
}

export interface InvoiceFilterDto {
  search?: string | null;
  contributorId?: number | null;
  page: number;
}

export interface PagedResponseDTO<T> {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: T[];
}

export interface InvoiceInitDto {
  suppliers: InvoiceSupplierDto[];
  paymentForms: InvoicePaymentFormDto[];
  invoices: PagedResponseDTO<InvoiceDto>;
}

/** Respuesta de la consulta RUC a SUNAT (para el modal de nuevo proveedor). */
export interface SunatContributorDTO {
  contributorRuc: string;
  contributorName: string;
  contributorAddress: string;
  contributorEconomicActivityDescription: string;
  contributorDistrict?: string | null;
  contributorProvince?: string | null;
  contributorDepartment?: string | null;
}

/** Datos para dar de alta un nuevo proveedor. */
export interface InvoiceSupplierCreateDto {
  contributorRuc: string;
  contributorName: string;
  contributorAddress: string;
  contributorEconomicActivityDescription?: string | null;
  contributorDistrict?: string | null;
  contributorProvince?: string | null;
  contributorDepartment?: string | null;
}
