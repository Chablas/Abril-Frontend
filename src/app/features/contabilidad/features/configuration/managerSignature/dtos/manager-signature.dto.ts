/** Firma del usuario actual, guardada en su registro de Person. */
export interface ManagerSignatureDto {
  /** data:image/png;base64,… para usar directamente en un <img src>. */
  imageDataUrl: string;
  updatedDateTime?: string | null;
}

/** Datos para guardar la firma: el data URL PNG exportado por el canvas. */
export interface ManagerSignatureSaveDto {
  imageBase64: string;
}
