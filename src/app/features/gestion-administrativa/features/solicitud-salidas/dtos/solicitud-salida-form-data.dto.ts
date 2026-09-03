export interface MotivoSalidaDto {
  id: number;
  descripcion: string;
  /** Si true, al elegir este motivo se exige subir un documento adjunto. */
  requiereAdjunto: boolean;
  /** Si true, las horas declaradas con este motivo son estimadas (cambia la etiqueta de la hora de retorno). */
  esHoraEstimada: boolean;
  /** Si true, al elegir este motivo el formulario exige escribir un motivo adicional (detalle). */
  requiereMotivoAdicional: boolean;
  /** Si false, el formulario no pide horas ni lugares y la solicitud queda con un solo
   *  trayecto (ej. licencia sin goce de haber). */
  pideHorasLugares: boolean;
  /** Si true, una salida con este motivo genera reembolso de movilidad. Los pares de
   *  `trayectosNoReembolsables` lo anulan; un trayecto nunca lo concede por su cuenta. */
  esReembolsable: boolean;
}

export interface LugarSalidaDto {
  id: number;
  nombreDisplay: string;
  esLibre: boolean;
}

export interface TrayectoCatalogoOptionDto {
  lugarOrigenId: number;
  lugarDestinoId: number;
  monto: number;
}

/** Par (origen, destino) del catálogo que nunca genera reembolso. */
export interface TrayectoNoReembolsableDto {
  lugarOrigenId: number;
  lugarDestinoId: number;
}

export interface SolicitudSalidaFormDataDto {
  motivos: MotivoSalidaDto[];
  lugares: LugarSalidaDto[];
  aprobadorEmail: string | null;
  /** True si el trabajador es de Tecnología de la Información. */
  esTI: boolean;
  /** Catálogo (lugarOrigenId, lugarDestinoId) → monto. Solo poblado si esTI. */
  trayectosCatalogo: TrayectoCatalogoOptionDto[];
  /** Pares (origen, destino) que anulan el reembolso del motivo. Llega para todos:
   *  la regla de reembolso no depende de ser TI (a diferencia de `trayectosCatalogo`,
   *  que lleva montos). */
  trayectosNoReembolsables: TrayectoNoReembolsableDto[];
}
