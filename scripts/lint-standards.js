// Bloquea dos patrones que ya causaron bugs reales en el pasado (ver CLAUDE.md):
// 1. <select> nativo en vez de app-search-select.
// 2. ::ng-deep fuera de shared/ para hackear el estilo de un componente compartido
//    (en vez de extender el input real, ej. badgeStyle).
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src', 'app');

const SELECT_ALLOWLIST = [
  'shared/components/app-generic-select/app-generic-select.component.html',
];

const NG_DEEP_ALLOWLIST_PREFIX = 'shared/';

function grepFiles(pattern, globs) {
  const globArgs = globs.map((g) => `--include="${g}"`).join(' ');
  try {
    const out = execSync(`grep -rl "${pattern}" ${globArgs} .`, { cwd: ROOT, encoding: 'utf8' });
    return out.split('\n').filter(Boolean).map((f) => f.replace(/^\.\//, ''));
  } catch (err) {
    if (err.status === 1) return []; // grep: sin matches
    throw err;
  }
}

const selectViolations = grepFiles('<select', ['*.component.html']).filter(
  (f) => !SELECT_ALLOWLIST.includes(f),
);

const ngDeepViolations = grepFiles('::ng-deep', ['*.component.css', '*.component.scss']).filter(
  (f) => !f.startsWith(NG_DEEP_ALLOWLIST_PREFIX),
);

let hasErrors = false;

if (selectViolations.length) {
  hasErrors = true;
  console.error('\n<select> nativo encontrado (usa app-search-select):');
  selectViolations.forEach((f) => console.error(`  - src/app/${f}`));
}

if (ngDeepViolations.length) {
  hasErrors = true;
  console.error('\n::ng-deep encontrado fuera de shared/ (extiende el componente compartido en vez de hackearlo):');
  ngDeepViolations.forEach((f) => console.error(`  - src/app/${f}`));
}

if (hasErrors) {
  console.error('\nVer convenciones de UI en CLAUDE.md antes de agregar excepciones.\n');
  process.exit(1);
}

console.log('lint-standards: OK');
