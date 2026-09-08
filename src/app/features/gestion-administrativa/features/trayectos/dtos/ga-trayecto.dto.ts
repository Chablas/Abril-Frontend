export interface GaTrayectoListItemDto {
  id: number;
  lugarOrigenId: number;
  lugarOrigenNombre: string;
  lugarDestinoId: number;
  lugarDestinoNombre: string;
  monto: number;
  /** Si false, ninguna salida por este par (origen, destino) genera reembolso de
   *  movilidad, aunque el motivo elegido sí lo permita. */
  esReembolsable: boolean;
  activo: boolean;
  createdAt: string;
}

export interface GaTrayectoCreateDto {
  lugarOrigenId: number;
  lugarDestinoId: number;
  monto: number;
  /** Si false, ninguna salida por este par (origen, destino) genera reembolso de
   *  movilidad, aunque el motivo elegido sí lo permita. */
  esReembolsable: boolean;
}

export interface GaTrayectoEditDto {
  lugarOrigenId: number;
  lugarDestinoId: number;
  monto: number;
  /** Si false, ninguna salida por este par (origen, destino) genera reembolso de
   *  movilidad, aunque el motivo elegido sí lo permita. */
  esReembolsable: boolean;
}

export interface GaTrayectoLugarOptionDto {
  id: number;
  nombreDisplay: string;
}
