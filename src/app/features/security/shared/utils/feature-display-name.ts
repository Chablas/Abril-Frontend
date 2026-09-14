import { FEATURE_DISPLAY_NAMES } from '../../../../core/navigation/feature-display-names.generated';

/** Grupo de los featureKey sin module_id en BD (ej. "ssoma.gestion.opt.*"). */
export const SIN_MODULO = 'Sin módulo asignado';

const ACRONYMS: Record<string, string> = {
  bim: 'BIM', gth: 'GTH', ivt: 'IVT', ssoma: 'SSOMA', rac: 'RAC', opt: 'OPT',
  sctr: 'SCTR', ats: 'ATS', emos: 'EMOs',
};

const WORD_OVERRIDES: Record<string, string> = {
  area: 'Área', areas: 'Áreas', auditoria: 'Auditoría',
  categoria: 'Categoría', categorias: 'Categorías',
  catalogo: 'Catálogo', catalogos: 'Catálogos',
  clinica: 'Clínica', clinicas: 'Clínicas',
  item: 'Ítem', items: 'Ítems',
  topico: 'Tópico', topicos: 'Tópicos',
  vidaley: 'Vida Ley',
};

/** feature_key mezcla claves en español (sin tildes, ej. "configuracion") con claves
 *  legacy en inglés (ej. "configuration", "construction") — ambas terminan en "-ion",
 *  así que hay que excluir las inglesas conocidas para no acentuarlas por error
 *  (bug real detectado al probar contra los 156 featureKey reales: "configuration"
 *  se convertía en "Configuratión"). */
const ENGLISH_WORDS = new Set([
  'accounting', 'category', 'companies', 'company', 'config', 'configuration', 'construction',
  'contractors', 'costs', 'invoices', 'learned', 'lessons', 'link', 'logbook', 'management',
  'measurement', 'milestone', 'milestones', 'monitoring', 'onboarding', 'project', 'projects',
  'reminders', 'report', 'resident', 'response', 'schedule', 'security', 'specialty', 'staff',
  'users', 'work', 'workers', 'folder', 'email', 'checklist', 'gantt', 'dossier',
]);

function humanizeWord(word: string): string {
  const lower = word.toLowerCase();
  if (ACRONYMS[lower]) return ACRONYMS[lower];
  if (WORD_OVERRIDES[lower]) return WORD_OVERRIDES[lower];
  let fixed = lower;
  // Palabras en español tipo "configuracion"/"gestion"/"revision" pierden la tilde al
  // convertirse en slug — se restituye salvo que sea un plural en "-iones" (no lleva
  // tilde, ej. "evaluaciones") o una palabra inglesa conocida (ej. "configuration").
  if (!ENGLISH_WORDS.has(lower) && /ion$/.test(fixed) && !/iones$/.test(fixed)) {
    fixed = fixed.slice(0, -2) + 'ón';
  }
  return fixed.charAt(0).toUpperCase() + fixed.slice(1);
}

function humanizeSegment(segment: string): string {
  return segment.split('-').map(humanizeWord).join(' ');
}

/** Traduce un feature_key técnico (ej. "planeamiento-bim.configuracion-inicial") a un
 *  nombre legible ("Configuración Inicial"). El primer segmento (prefijo de dominio) se
 *  descarta porque ya está representado por el nombre del módulo/grupo; los segmentos
 *  restantes (para claves anidadas, ej. "ssoma.gestion.rac.crear") se unen con "›" a
 *  modo de breadcrumb. Es solo presentación — el featureKey real se sigue mostrando
 *  como texto secundario en cada fila para no perder trazabilidad de debugging.
 *
 *  Es el ÚLTIMO fallback (ver `displayName()`): un featureKey solo cae acá cuando no
 *  aparece ni en el sidebar (navigation.service.ts) ni en ningún route.data.titulo del
 *  resto de la app — ej. permisos finos sin pantalla propia como
 *  "arquitectura-comercial.observaciones.editar", o las pantallas de RAC/OPT/Inspección
 *  que no declaran titulo. Un nombre generado es mejor que nada, pero debe ser la
 *  excepción: si esto se usa para un featureKey que SÍ tiene label/titulo real en la
 *  app, `scripts/generate-feature-display-names.js` está desactualizado — correrlo de
 *  nuevo. */
export function humanizeFeatureKey(featureKey: string): string {
  const parts = featureKey.split('.');
  const rest = parts.length > 1 ? parts.slice(1) : parts;
  return rest.map(humanizeSegment).join(' › ');
}

/** Nombre a mostrar para un featureKey en Seguridad (editar rol, Funcionalidades y los
 *  detalles): prioriza el texto real ya usado en la app (`FEATURE_DISPLAY_NAMES`,
 *  generado desde navigation.service.ts + route.data.titulo — ver
 *  scripts/generate-feature-display-names.js) y solo genera un nombre heurístico cuando
 *  el featureKey no aparece en ningún lado del frontend. */
export function displayName(featureKey: string): string {
  return FEATURE_DISPLAY_NAMES[featureKey] ?? humanizeFeatureKey(featureKey);
}
