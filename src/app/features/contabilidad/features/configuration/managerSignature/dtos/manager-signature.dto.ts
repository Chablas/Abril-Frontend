/** Firma del Gerente General (singleton) configurada. */
export interface ManagerSignatureDto {
  managerSignatureId: number;
  /** data:image/png;base64,… para usar directamente en un <img src>. */
  imageDataUrl: string;
  updatedDateTime?: string | null;
  createdDateTime: string;
}

/** Datos para guardar la firma: el data URL PNG exportado por el canvas. */
export interface ManagerSignatureSaveDto {
  imageBase64: string;
}
