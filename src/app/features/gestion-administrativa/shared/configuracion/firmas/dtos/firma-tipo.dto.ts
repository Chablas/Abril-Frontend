import { FirmaTipoDto } from '../../../../../../core/firma/firma-personal.dto';

/** Respuesta del endpoint de la sección "Firmas". */
export interface FirmaTiposResult {
  tipos: FirmaTipoDto[];
}

/** Respuesta al guardar: el catálogo ya actualizado más el aviso. */
export interface FirmaTiposSaveResult extends FirmaTiposResult {
  message: string;
}

// Reexportados para que la sección importe sus tipos de un solo sitio; el catálogo vive en core/
// porque la firma no es de Gestión Administrativa, se estampa en tres módulos.
export type { FirmaTipoDto, FirmaTipoCodigo } from '../../../../../../core/firma/firma-personal.dto';
