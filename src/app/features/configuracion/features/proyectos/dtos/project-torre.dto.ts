export interface ProjectTorreDto {
  id: number;
  nombre: string;
  cantidadSotanos: number;
  cantidadPisos: number;
  cantidadCisternas: number;
}

export interface ProjectTorreGuardarDto {
  nombre: string;
  cantidadSotanos: number;
  cantidadPisos: number;
  cantidadCisternas: number;
}
