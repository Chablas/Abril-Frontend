export interface ResponsableLookupDto {
  id: number;
  apellidoNombre: string;
  /**
   * Correo corporativo, solo para mostrarlo debajo del desplegable. Lo que se guarda es
   * el `id`: el correo se vuelve a leer de la ficha del trabajador al enviar.
   */
  email?: string | null;
}

/** Los cuatro desplegables del modal crear/editar proyecto, en una sola respuesta. */
export interface ProjectLookupsDto {
  arqCom: ResponsableLookupDto[];
  udp: ResponsableLookupDto[];
  /** Elegibles como residente y coordinador administrativo: personal Casa no retirado con correo. */
  personalCasa: ResponsableLookupDto[];
  /** Subárea "Planeamiento BIM". */
  planeamientoUdp: ResponsableLookupDto[];
}
