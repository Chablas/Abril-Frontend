/** Acceso real del usuario a los flujos de evaluaciones, resuelto por puesto en el backend. */
export interface EvAccesoDto {
  esJefeSsoma: boolean;
  esCoordinadorSsoma: boolean;
  esPrevencionista: boolean;
  esEquipoSsoma: boolean;
}
