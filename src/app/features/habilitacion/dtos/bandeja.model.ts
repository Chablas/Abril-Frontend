export interface BandejaItemDto {
  id: number;
  tipo: string;
  nombreEntregable: string;
  entidadNombre: string;
  empresaNombre?: string;
  proyectoNombre?: string;
  proyectoId?: number;
  estado: string;
  vigencia?: string;
  archivoUrl?: string;
  obsContratista?: string;
  responsable: string;
  fechaEnvio?: string;
}

export interface BandejaAprobarDto {
  estado: string;
  obsAbril?: string;
  vigencia?: string;
}
