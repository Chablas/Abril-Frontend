/**
 * Opción del desplegable "Razón social": una de las empresas operativas del grupo con lo que le
 * queda de su tope de 20 trabajadores.
 *
 * Vive en `shared/` porque la cuenta la comparten el modal "Programar EMO con clínica" —el único
 * punto donde se le asigna la razón social a un ingreso— y Configuración → Razones Sociales. La
 * hace el backend en un solo sitio (`RazonSocialCuposHelper`), así que las dos pantallas muestran
 * exactamente lo mismo.
 */
export interface RazonSocialCupo {
  id: number;
  nombre: string;
  /**
   * Cupos = tope (20) − trabajadores vigentes de la razón social en la base maestra. El personal
   * de obra y los practicantes no consumen cupo. Nunca negativo.
   */
  cuposDisponibles: number;
}

/**
 * Lo que el modal de programación de EMO necesita para pintar el desplegable: las razones sociales
 * y si a ESTE trabajador le aplica el tope. Van juntas porque el campo no se puede pintar con una
 * sola de las dos.
 */
export interface RazonesSocialesEmo {
  razones: RazonSocialCupo[];
  /**
   * true = la vacante de la que sale este ingreso es un REEMPLAZO, así que se puede elegir una
   * razón social llena: el que entra y el que sale conviven un mes y la razón social se pasa del
   * tope a propósito hasta que se dé de baja al reemplazado.
   */
  sinTopePorReemplazo: boolean;
}
