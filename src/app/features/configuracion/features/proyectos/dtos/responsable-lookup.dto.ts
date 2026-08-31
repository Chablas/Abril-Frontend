export interface ResponsableLookupDto {
  id: number;
  apellidoNombre: string;
  /**
   * Correo corporativo, solo para mostrarlo debajo del desplegable. Lo que se guarda es
   * el `id`: el correo se vuelve a leer de la ficha del trabajador al enviar.
   */
  email?: string | null;
}

/** Los tres desplegables del modal crear/editar proyecto, en una sola respuesta. */
export interface ProjectLookupsDto {
  arqCom: ResponsableLookupDto[];
  udp: ResponsableLookupDto[];
  /** Elegibles como coordinador administrativo: personal Casa no retirado con correo. */
  coordAdmins: ResponsableLookupDto[];
}
