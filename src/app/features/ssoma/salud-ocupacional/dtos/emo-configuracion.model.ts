/** Tipo de destinatario del correo de programación de EMO. */
export type EmoCorreoTipo = 'PRINCIPAL' | 'COPIA';

/** Una fila de la pantalla Configuración de EMOs → Correos de programación. */
export interface EmoCorreoDestinatarioDto {
  id: number;
  tipo: EmoCorreoTipo;
  /** Solo en destinatarios fijos/dinámicos (hoy únicamente 'CLINICA'). */
  codigo: string | null;
  /** null solo en destinatarios fijos: su correo se resuelve al enviar. */
  email: string | null;
  nombre: string | null;
  descripcion: string | null;
  /** false = fila fija: solo se puede activar/desactivar, no editar ni eliminar. */
  editable: boolean;
  /** true = se le envía el correo; false = no se le envía. */
  active: boolean;
  orden: number;
}

/** Respuesta única de la pantalla: ambas listas en una sola petición. */
export interface EmoCorreosConfigDto {
  principales: EmoCorreoDestinatarioDto[];
  copias: EmoCorreoDestinatarioDto[];
}

export interface EmoCorreoDestinatarioCreateDto {
  tipo: EmoCorreoTipo;
  email: string;
  nombre?: string | null;
}

export interface EmoCorreoDestinatarioUpdateDto {
  email: string;
  nombre?: string | null;
}
