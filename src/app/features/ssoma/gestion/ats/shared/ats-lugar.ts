/** "Piso 1, Piso 2, Piso 3, Piso 4" → "Piso 1-4": comprime pisos consecutivos en rango para que el
 *  lugar no ocupe 25 líneas (listado y panel del grupo usan el mismo criterio). */
export function comprimirPisos(pisos?: string | null): string {
  if (!pisos) return '';
  const labels = pisos.split(',').map((s) => s.trim()).filter(Boolean);

  const piso = /^Piso (\d+)$/i;
  const salida: string[] = [];
  let rango: number[] = [];

  const cerrarRango = () => {
    if (rango.length === 0) return;
    salida.push(rango.length === 1 ? `Piso ${rango[0]}` : `Piso ${rango[0]}-${rango[rango.length - 1]}`);
    rango = [];
  };

  for (const label of labels) {
    const m = piso.exec(label);
    const n = m ? Number(m[1]) : null;
    if (n !== null && (rango.length === 0 || n === rango[rango.length - 1] + 1)) {
      rango.push(n);
    } else {
      cerrarRango();
      if (n !== null) rango.push(n);
      else salida.push(label);
    }
  }
  cerrarRango();
  return salida.join(', ');
}
