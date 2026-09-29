export interface ProjectTorreDTO {
  id: number;
  nombre: string;
  cantidadSotanos: number;
  cantidadPisos: number;
  cantidadCisternas: number;
}

/** Un nivel calculado de una torre (no persiste en base) — para el selector de "Piso/Nivel". */
export interface NivelTorreOpcion {
  id: string;
  label: string;
}

/** Arma la lista de niveles de una torre a partir de sus cantidades: Sótano N..1 (de abajo hacia
 *  arriba en el edificio real, pero se listan del más profundo al más alto para lectura natural),
 *  Piso 1..N, Cisterna 1..N, y Azotea siempre al final. */
export function nivelesDeTorre(torre: ProjectTorreDTO): NivelTorreOpcion[] {
  const niveles: NivelTorreOpcion[] = [];
  for (let i = torre.cantidadSotanos; i >= 1; i--) niveles.push({ id: `sotano-${i}`, label: `Sótano ${i}` });
  for (let i = 1; i <= torre.cantidadPisos; i++) niveles.push({ id: `piso-${i}`, label: `Piso ${i}` });
  for (let i = 1; i <= torre.cantidadCisternas; i++) niveles.push({ id: `cisterna-${i}`, label: `Cisterna ${i}` });
  niveles.push({ id: 'azotea', label: 'Azotea' });
  return niveles;
}
