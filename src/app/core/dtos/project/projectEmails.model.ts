/** Un trabajador elegible como residente o coordinador administrativo del proyecto. */
export interface ResidenteOptionDTO {
  workerId: number;
  nombreCompleto: string;
  email: string;
}

/**
 * Lo que se manda al guardar los correos SSOMA del proyecto.
 *
 * Ni el residente ni el coordinador administrativo son correos escritos a mano: son el id
 * del trabajador. Su correo se lee de `workers.email_corporativo` al enviar, así no queda
 * una segunda copia que se desactualiza. En esos dos campos null SÍ limpia el valor (el
 * formulario manda siempre el objeto completo); en los correos de texto, null es "no tocar".
 */
export interface ProjectEmailsDTO {
  residenteWorkersId?: number | null;
  workersCoordAdminId?: number | null;
  emailResponsable?: string | null;
  emailRrhh?: string | null;
  emailCoordSsoma?: string | null;
}

/** Respuesta al abrir el formulario: valores actuales + trabajadores elegibles. */
export interface ProjectEmailsResponseDTO extends ProjectEmailsDTO {
  /** Nombre del residente actual, para mostrarlo sin buscarlo en la lista. */
  residenteNombre?: string | null;
  /** Correo corporativo del residente actual — el que realmente se va a usar. */
  residenteEmail?: string | null;
  /** Nombre del coordinador administrativo actual. */
  coordAdminNombre?: string | null;
  /** Correo corporativo del coordinador administrativo actual. */
  coordAdminEmail?: string | null;
  residentes: ResidenteOptionDTO[];
}
