/** Una opción configurable dentro de un paso: la etiqueta del checkbox y su valor. */
export interface CostsPasoOptionDto {
  projectSubContractorStepOptionId: number;
  /** Clave con la que el backend consume la opción. No se muestra. */
  optionKey: string;
  /** Etiqueta del checkbox. */
  optionDescription: string;
  enabled: boolean;
}

/** Un paso del flujo de adjudicaciones con las opciones que tiene configurables. */
export interface CostsPasoDto {
  /** Número del paso (1..9). */
  stepNumber: number;
  stepDescription: string;
  options: CostsPasoOptionDto[];
}

export interface CostsPasoOptionUpdateDto {
  projectSubContractorStepOptionId: number;
  enabled: boolean;
}
