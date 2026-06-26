export interface InvoiceFolderDto {
  invoiceFolderId: number;
  name: string;
  linkUrl: string;
  driveId: string;
  folderId: string;
  folderName?: string | null;
  webUrl?: string | null;
  active: boolean;
  createdDateTime: string;
  createdUserId: number;
}

export interface InvoiceFolderCreateDto {
  name: string;
  linkUrl: string;
  driveId: string;
  folderId: string;
}

export interface InvoiceFolderUpdateDto {
  invoiceFolderId: number;
  name: string;
  linkUrl: string;
  driveId: string;
  folderId: string;
  active: boolean;
}

export interface InvoiceFolderFilterDto {
  page: number;
}
