# Cómo agregar un tipo de slide/pregunta nuevo

Checklist para agregar un tipo de slide nuevo al módulo de cursos (`src/app/features/cursos/`),
pensado para el usuario o para una futura sesión de Claude Code sin tener que redescubrir la
arquitectura.

El backend (`Abril_Backend/Features/CursoModule`) ya es 100% genérico (jsonb libre por tipo,
corrección por `respuestaCorrecta`) y **no necesita cambios** salvo el caso especial del último
punto. **No lo toques** para agregar un tipo nuevo, salvo que se indique lo contrario más abajo.

## 1. Definir el shape de `configuracionJson`

Antes de escribir código, define qué campos necesita el tipo nuevo dentro de
`configuracionJson` (el texto libre que guarda el backend, shape por `tipoCodigo`):

- Si el tipo es evaluable (se puede calificar), incluye un campo `respuestaCorrecta` con el
  shape que le corresponda (booleano, id de opción, array de ids, etc.) — la corrección genérica
  del backend compara la respuesta del usuario contra este campo.
- Si el tipo NO se califica (ej. algo puramente interactivo/decorativo como un "rasca y gana" sin
  nota), incluye `modo_correccion: 'sin_calificar'` en vez de `respuestaCorrecta`.
- Si aplica, incluye el bloque opcional `estilo?: SlideEstilo` (mismo shape que ya usan los demás
  tipos: `fondoClaro`, `fondoOscuro`, `burbujas`) para personalizar el fondo animado del player.

## 2. Agregar las interfaces TS en `dtos/curso.dtos.ts`

Sigue el patrón ya usado por `ContenidoConfig`, `VerdaderoFalsoConfig`, `OpcionMultipleConfig`,
`MarcarImagenConfig`, `ArrastrarSoltarConfig`, `OrdenarConfig` (ver el final de ese archivo).
Cada config nueva debe incluir `estilo?: SlideEstilo` si aplica, igual que las demás.

## 3. Crear el componente Angular standalone

Ubicación: `pages/curso-player/slides/slide-<nombre>/slide-<nombre>.ts/.html/.css`.

- Standalone, con `@Input() slide: CursoSlideDto` y `@Output() respuesta = new EventEmitter<any>()`.
- Aplica las animaciones en cascada compartidas de `cursos-cascada.css` (mismo patrón que los
  6 componentes existentes).
- No te preocupes por el fondo animado: `curso-player` ya lo maneja a nivel de página
  (`app-fondo-animado`), el componente de slide solo se ocupa de su propio contenido.
- Revisa un componente existente similar (ej. `slide-verdadero-falso` para algo simple, o
  `slide-arrastrar-soltar`/`slide-ordenar` para algo con interacción más compleja) como
  referencia de estilo y estructura antes de escribir desde cero.

## 4. Registrar el tipo nuevo

- Agrega una entrada en `SLIDE_TIPOS` en
  `pages/curso-player/slide-tipo-registro.ts` (`tipoCodigo`, `component`, `etiqueta`).
- Agrega también su `@case` correspondiente en el `@switch` de `pages/curso-player/curso-player.html`
  (el render sigue siendo un `@switch` explícito por simplicidad; `SLIDE_TIPOS` es la fuente de
  verdad para validar `tipoCodigo`/mostrar `etiqueta`, pero **ambos deben mantenerse en sync
  manualmente** — no olvides este paso).
- Importa el componente nuevo en el array `imports` de `CursoPlayer` (`curso-player.ts`), igual
  que los 6 existentes.

## 5. SQL de ejemplo para probarlo

Usa como plantilla de formato el archivo
`Abril_Backend/Migrations_Manual/2026-09-22_curso_ejemplo_prevencion_caidas.sql` (inserta un
curso + sus slides, incluyendo una del tipo nuevo con su `configuracionJson`). Como siempre,
cualquier cambio de esquema/datos va como SQL para correr manualmente en pgAdmin, nunca con
`dotnet ef migrations`.

## 6. Backend: normalmente no requiere cambios

El motor de corrección de `CursoIntentoService.cs` es genérico (compara la respuesta del usuario
contra `respuestaCorrecta` por igualdad). Esto cubre la gran mayoría de tipos nuevos.

**Excepción:** si el tipo nuevo necesita una lógica de corrección que NO sea "igualdad exacta"
(por ejemplo, corrección parcial, por rangos, o con tolerancia), sí hay que tocar
`CursoIntentoService.cs` en el backend. En ese caso, **avisa antes de tocar el backend** — no
asumas que aplica el motor genérico.
