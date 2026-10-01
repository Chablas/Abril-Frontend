import { AtsGuardarRequestDto } from '../dtos/ats.dtos';

/** Firma de un integrante capturada en el teléfono SIN conexión: selfie + GPS + hora del dispositivo. La firma
 *  (imagen) la aplica el servidor al sincronizar, con la firma digital registrada del trabajador. */
export interface AdhesionOffline {
  id: string;
  workerId: number;
  nombre: string;
  dniConfirmacion: string;
  selfieBase64: string;
  horaDispositivo: string;
  lat: number | null;
  lng: number | null;
  precisionMetros: number | null;
  aceptaConsentimiento: boolean;
  estado: 'Pendiente' | 'Enviado' | 'Error';
  error?: string;
}

/** ATS grupal armado sin conexión, a la espera de subirse. `id` es el ClientId que hace idempotente el envío. */
export interface PaqueteOffline {
  id: string;
  tokenProyecto: string;
  proyectoNombre?: string;
  autor: { workerId: number; nombre: string; dniConfirmacion: string };
  contenido: AtsGuardarRequestDto;
  actividadResumen: string;
  lugarResumen: string;
  /** Hora del dispositivo al armarlo — es la hora real de la jornada. */
  capturadoEn: string;
  estado: 'Pendiente' | 'Parcial' | 'Sincronizado';
  grupoToken?: string;
  grupoId?: number;
  adhesiones: AdhesionOffline[];
}
