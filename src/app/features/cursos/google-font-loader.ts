/** Inyecta un <link> de Google Fonts para la familia dada si todavía no está cargada en
 *  esta página — funciona tanto en el editor (al elegir un par de fuentes de marca) como en
 *  el reproductor real (al pintar un elemento de texto que trae `fontFamily` guardado). No
 *  se guarda ninguna URL: se reconstruye siempre a partir del nombre de la familia, así
 *  sirve para cualquier fuente de Google Fonts, no solo las del catálogo curado. */
export function cargarGoogleFont(nombreFuente: string | null | undefined): void {
  if (!nombreFuente || typeof document === 'undefined') return;

  const id = 'google-font-' + nombreFuente.replace(/\s+/g, '-').toLowerCase();
  if (document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(nombreFuente)}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}
