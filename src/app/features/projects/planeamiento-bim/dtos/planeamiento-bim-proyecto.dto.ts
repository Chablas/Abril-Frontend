/** Catálogo de proyectos para el selector de las pestañas de Planeamiento BIM, ya
 *  filtrado por rol/asignación en backend (admin ve todos, PLANEAMIENTO_UDP solo
 *  donde es responsable, cualquier otro caso devuelve []). No requiere filtro
 *  adicional en el frontend. */
export interface ProyectoBimSimpleDto {
  projectId: number;
  projectDescription: string;
}
