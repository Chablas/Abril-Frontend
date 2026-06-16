/**
 * Validación de correos compartida por las features del módulo de contratistas
 * (registro y gestión).
 *
 * Regla: el correo solo puede contener letras y números, además del '@' y el '.'.
 * No se permiten símbolos como ' < > + - _ etc., y no puede empezar con un símbolo
 * (debe empezar con una letra o número). Debe tener exactamente un '@' y un dominio
 * con al menos un punto.
 */
export const CONTRACTOR_EMAIL_REGEX =
  /^[A-Za-z0-9]+(\.[A-Za-z0-9]+)*@[A-Za-z0-9]+(\.[A-Za-z0-9]+)+$/;

/** Devuelve true si el correo cumple con la regla (solo letras, números, '@' y '.'). */
export function isValidContractorEmail(email: string): boolean {
  return CONTRACTOR_EMAIL_REGEX.test(email.trim());
}
