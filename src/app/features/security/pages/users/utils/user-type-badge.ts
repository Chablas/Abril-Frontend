/** Clases del badge de tipo de usuario (PERSONA / COLABORADOR / CONTRATISTA): tabla y detalle. */
export function userTypeBadgeClass(type: string): string {
  if (type === 'PERSONA') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (type === 'COLABORADOR') return 'bg-purple-100 text-purple-800 border-purple-200';
  return 'bg-orange-100 text-orange-800 border-orange-200';
}
