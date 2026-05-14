export interface PsssTemplateDTO {
  psssTemplateId: number;
  templateName: string;
  description?: string;
  active: boolean;
  psssCount: number;
}

export interface PsssTemplateSimpleDTO {
  psssTemplateId: number;
  templateName: string;
}

export interface PsssTemplateCreateDTO {
  templateName: string;
  description?: string;
}

export interface PsssTemplatePagedDTO {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: PsssTemplateDTO[];
}

export interface PsssAllFlatDTO {
  psssId: number;
  label: string;
  phaseId: number;
  phaseDescription: string;
  templateId?: number;
  templateName?: string;
}

export interface UpdateTemplatePsssDTO {
  psssIds: number[];
}
