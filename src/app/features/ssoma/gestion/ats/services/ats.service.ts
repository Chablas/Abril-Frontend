import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  AtsInitDto,
  AtsPasoDto,
  AtsCategoriaPasoDto,
  AtsGuardarRequestDto,
  AtsFirmarRequestDto,
  AtsResponseDto,
  AtsFiltroDto,
  AtsListResponseDto,
  AtsPlantillaDto,
  AtsPlantillaGuardarRequestDto,
  AtsPuestoDto,
  AtsPasoPuestoDto,
  AtsAutorizacionTrabajadorDto,
  AtsFirmarVistoRequestDto,
  AtsPeligroDto,
  AtsPlantillaActividadDto,
  AtsPlantillaActividadGuardarRequestDto,
  AtsPlantillaPasoGuardarRequestDto,
  AtsPlantillaActividadPeligrosRequestDto,
  AtsRiesgoConControlesDto,
  AtsRiesgoControlGuardarRequestDto,
  AtsAutorizacionFirmaDigitalRequestDto,
  AtsPlantillaPuestoDto,
  AtsGrupoCrearResponseDto,
  AtsGrupoEstadoDto,
  AtsGrupoResumenPublicoDto,
  AtsGrupoWorkerOpcionDto,
  AtsGrupoUnirseRequestDto,
  AtsGrupoCapatazPublicoDto,
  AtsGrupoCapatazFirmarRequestDto,
  AtsGrupoProyectoPublicoDto,
  AtsGrupoInitPublicoRequestDto,
  AtsGrupoCrearPublicoRequestDto,
} from '../dtos/ats.dtos';

function authHeaders(): HttpHeaders {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
}

@Injectable({ providedIn: 'root' })
export class AtsService {
  private base = `${environment.apiUrl}api/v1/ssoma/ats`;

  constructor(private http: HttpClient) {}

  getInit(): Observable<AtsInitDto> {
    return this.http.get<AtsInitDto>(`${this.base}/init`, { headers: authHeaders() });
  }

  /** Pasos para un puesto ARBITRARIO (no el del usuario logueado) — lo usa el wizard de ATS
   *  Grupal cuando el creador elige el puesto/tipo de trabajo de la cuadrilla. Sin authHeaders
   *  a propósito: también lo llama el wizard público (/ats-grupal/crear/:token). */
  getPasosPorPuesto(puestoId: number, workerId = 0): Observable<AtsCategoriaPasoDto[]> {
    return this.http.get<AtsCategoriaPasoDto[]>(`${this.base}/pasos-por-puesto/${puestoId}`, {
      headers: authHeaders(),
      params: { workerId },
    });
  }

  crear(dto: AtsGuardarRequestDto): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, dto, { headers: authHeaders() });
  }

  editar(id: number, dto: AtsGuardarRequestDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, dto, { headers: authHeaders() });
  }

  getPorId(id: number): Observable<AtsResponseDto> {
    return this.http.get<AtsResponseDto>(`${this.base}/${id}`, { headers: authHeaders() });
  }

  firmar(id: number, body: AtsFirmarRequestDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/firmar`, body, { headers: authHeaders() });
  }

  listar(filtro: AtsFiltroDto): Observable<AtsListResponseDto> {
    let params = new HttpParams();
    if (filtro.proyectoId) params = params.set('proyectoId', filtro.proyectoId);
    if (filtro.workerId) params = params.set('workerId', filtro.workerId);
    if (filtro.fechaDesde) params = params.set('fechaDesde', filtro.fechaDesde);
    if (filtro.fechaHasta) params = params.set('fechaHasta', filtro.fechaHasta);
    if (filtro.estado) params = params.set('estado', filtro.estado);
    if (filtro.page) params = params.set('page', filtro.page);
    return this.http.get<AtsListResponseDto>(this.base, { headers: authHeaders(), params });
  }

  getPdfBlob(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/pdf`, { headers: authHeaders(), responseType: 'blob' });
  }

  getPlantillaAutorizacionPdf(workerId: number): Observable<Blob> {
    return this.http.get(`${this.base}/trabajadores/${workerId}/autorizacion/pdf`, { headers: authHeaders(), responseType: 'blob' });
  }

  firmarCapataz(id: number, body: AtsFirmarVistoRequestDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/firmar-capataz`, body, { headers: authHeaders() });
  }

  /** Capataz/Maestro con cuenta: firma el grupo completo (una vez por cuadrilla). */
  firmarCapatazGrupo(grupoId: number, body: AtsFirmarVistoRequestDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/grupo/${grupoId}/firmar-capataz`, body, { headers: authHeaders() });
  }

  guardarEmailPersonalAutorizacion(workerId: number, body: { email: string; aceptaDeclaracion: boolean }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/trabajadores/${workerId}/autorizacion/email`, body, { headers: authHeaders() });
  }

  crearCuentaCapataz(workerId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/trabajadores/${workerId}/autorizacion/crear-cuenta`, {}, { headers: authHeaders() });
  }

  firmarAutorizacion(id: number, body: AtsFirmarVistoRequestDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/autorizar`, body, { headers: authHeaders() });
  }

  firmarVistoSsoma(id: number, body: AtsFirmarVistoRequestDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/visto-bueno-ssoma`, body, { headers: authHeaders() });
  }

  // ── Administración de plantillas ──────────────────────────────────────

  getPuestos(): Observable<AtsPuestoDto[]> {
    return this.http.get<AtsPuestoDto[]>(`${this.base}/puestos`, { headers: authHeaders() });
  }

  crearPaso(categoriaId: number, texto: string): Observable<AtsPasoDto> {
    return this.http.post<AtsPasoDto>(`${this.base}/pasos`, { categoriaId, texto }, { headers: authHeaders() });
  }

  getPasoPuestoMapeo(): Observable<AtsPasoPuestoDto[]> {
    return this.http.get<AtsPasoPuestoDto[]>(`${this.base}/pasos-puesto`, { headers: authHeaders() });
  }

  setPasoPuestos(pasoId: number, puestoIds: number[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/pasos-puesto/${pasoId}`, puestoIds, { headers: authHeaders() });
  }

  getPlantillaPuestoMapeo(): Observable<AtsPlantillaPuestoDto[]> {
    return this.http.get<AtsPlantillaPuestoDto[]>(`${this.base}/plantillas-puesto`, { headers: authHeaders() });
  }

  setPlantillaPuestos(plantillaId: number, puestoIds: number[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/plantillas-puesto/${plantillaId}`, puestoIds, { headers: authHeaders() });
  }

  getPlantillas(): Observable<AtsPlantillaDto[]> {
    return this.http.get<AtsPlantillaDto[]>(`${this.base}/plantillas`, { headers: authHeaders() });
  }

  crearPlantilla(dto: AtsPlantillaGuardarRequestDto): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/plantillas`, dto, { headers: authHeaders() });
  }

  editarPlantilla(id: number, dto: AtsPlantillaGuardarRequestDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/plantillas/${id}`, dto, { headers: authHeaders() });
  }

  desactivarPlantilla(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/plantillas/${id}`, { headers: authHeaders() });
  }

  getPeligros(): Observable<AtsPeligroDto[]> {
    return this.http.get<AtsPeligroDto[]>(`${this.base}/peligros`, { headers: authHeaders() });
  }

  setRiesgoRequierePetar(riesgoId: number, requierePetar: boolean): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base}/riesgos/${riesgoId}/requiere-petar`,
      { requierePetar },
      { headers: authHeaders() },
    );
  }

  // ── Autorización de uso de firma digital e imagen (firmada en físico) — gate para poder hacer ATS ──

  /** El propio trabajador la consulta ANTES de abrir "Nuevo ATS", para mostrar el bloqueo
   *  claro en vez de dejarlo llenar todo el wizard y recién fallar al guardar. */
  getMiAutorizacion(): Observable<{ tieneAutorizacion: boolean }> {
    return this.http.get<{ tieneAutorizacion: boolean }>(`${this.base}/mi-autorizacion`, { headers: authHeaders() });
  }

  /** La firma que el Coordinador SSOMA ya capturó para la Autorización (SSO-FO-151) — se ofrece
   *  reusar en vez de dibujarla de nuevo al firmar un ATS. */
  getMiFirmaDigitalAutorizacion(): Observable<{ firmaDigitalUrl: string | null }> {
    return this.http.get<{ firmaDigitalUrl: string | null }>(`${this.base}/mi-firma-digital-autorizacion`, { headers: authHeaders() });
  }

  /** La imagen en sí (no la URL) — pasa por el backend porque el navegador no puede traer el
   *  blob del storage directo (es privado). Usar esto en vez de hacer un http.get a la URL cruda. */
  getMiFirmaDigitalAutorizacionImagenBlob(): Observable<Blob> {
    return this.http.get(`${this.base}/mi-firma-digital-autorizacion/imagen`, { headers: authHeaders(), responseType: 'blob' });
  }

  getTrabajadoresAutorizacion(): Observable<AtsAutorizacionTrabajadorDto[]> {
    return this.http.get<AtsAutorizacionTrabajadorDto[]>(`${this.base}/trabajadores-autorizacion`, { headers: authHeaders() });
  }

  firmarDigitalAutorizacion(workerId: number, dto: AtsAutorizacionFirmaDigitalRequestDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/trabajadores/${workerId}/autorizacion/firma-digital`, dto, { headers: authHeaders() });
  }

  subirAutorizacionPermiso(workerId: number, archivo: File): Observable<{ message: string }> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<{ message: string }>(`${this.base}/trabajadores/${workerId}/autorizacion`, formData, {
      headers: authHeaders(),
    });
  }

  // ── Actividades/pasos por plantilla ─────────────────────────────────────

  getActividadesDePlantilla(plantillaId: number): Observable<AtsPlantillaActividadDto[]> {
    return this.http.get<AtsPlantillaActividadDto[]>(`${this.base}/plantillas/${plantillaId}/actividades`, { headers: authHeaders() });
  }

  crearActividad(plantillaId: number, dto: AtsPlantillaActividadGuardarRequestDto): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/plantillas/${plantillaId}/actividades`, dto, { headers: authHeaders() });
  }

  editarActividad(actividadId: number, dto: AtsPlantillaActividadGuardarRequestDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/actividades/${actividadId}`, dto, { headers: authHeaders() });
  }

  eliminarActividad(actividadId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/actividades/${actividadId}`, { headers: authHeaders() });
  }

  setActividadPeligros(actividadId: number, dto: AtsPlantillaActividadPeligrosRequestDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/actividades/${actividadId}/peligros`, dto, { headers: authHeaders() });
  }

  crearPasoActividad(actividadId: number, dto: AtsPlantillaPasoGuardarRequestDto): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/actividades/${actividadId}/pasos`, dto, { headers: authHeaders() });
  }

  editarPasoActividad(pasoId: number, dto: AtsPlantillaPasoGuardarRequestDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/pasos/${pasoId}`, dto, { headers: authHeaders() });
  }

  eliminarPasoActividad(pasoId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/pasos/${pasoId}`, { headers: authHeaders() });
  }

  // ── Controles sugeridos por riesgo ──────────────────────────────────────

  getRiesgosConControles(): Observable<AtsRiesgoConControlesDto[]> {
    return this.http.get<AtsRiesgoConControlesDto[]>(`${this.base}/riesgos-controles`, { headers: authHeaders() });
  }

  crearControl(riesgoId: number, dto: AtsRiesgoControlGuardarRequestDto): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/riesgos/${riesgoId}/controles`, dto, { headers: authHeaders() });
  }

  editarControl(controlId: number, dto: AtsRiesgoControlGuardarRequestDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/controles/${controlId}`, dto, { headers: authHeaders() });
  }

  eliminarControl(controlId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/controles/${controlId}`, { headers: authHeaders() });
  }

  // ── ATS Grupal (autor, requiere login) ──────────────────────────────────

  crearGrupo(dto: AtsGuardarRequestDto): Observable<AtsGrupoCrearResponseDto> {
    return this.http.post<AtsGrupoCrearResponseDto>(`${this.base}/grupo`, dto, { headers: authHeaders() });
  }

  getEstadoGrupo(id: number): Observable<AtsGrupoEstadoDto> {
    return this.http.get<AtsGrupoEstadoDto>(`${this.base}/grupo/${id}/estado`, { headers: authHeaders() });
  }

  cerrarGrupo(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/grupo/${id}/cerrar`, {}, { headers: authHeaders() });
  }

  // ── ATS Grupal (adhesión pública, SIN login — el token del QR es el único candado) ──

  getResumenPublico(token: string): Observable<AtsGrupoResumenPublicoDto> {
    return this.http.get<AtsGrupoResumenPublicoDto>(`${this.base}/grupo/publico/${token}/resumen`);
  }

  getWorkersParaAdhesion(token: string): Observable<AtsGrupoWorkerOpcionDto[]> {
    return this.http.get<AtsGrupoWorkerOpcionDto[]>(`${this.base}/grupo/publico/${token}/trabajadores`);
  }

  unirseAGrupo(token: string, dto: AtsGrupoUnirseRequestDto): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(`${this.base}/grupo/publico/${token}/unirse`, dto);
  }

  // ── Firma única del Capataz por cuadrilla (link público, sin login) ─────

  getCapatazPublico(token: string): Observable<AtsGrupoCapatazPublicoDto> {
    return this.http.get<AtsGrupoCapatazPublicoDto>(`${this.base}/grupo/publico/${token}/capataz`);
  }

  firmarCapatazPublico(token: string, body: AtsGrupoCapatazFirmarRequestDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/grupo/publico/${token}/capataz/firmar`, body);
  }

  // ── QR fijo por proyecto — crear ATS Grupal sin login ───────────────────

  getQrProyecto(proyectoId: number): Observable<{ token: string }> {
    return this.http.get<{ token: string }>(`${this.base}/grupo/proyecto-qr/${proyectoId}`, { headers: authHeaders() });
  }

  getResumenProyectoPublico(tokenProyecto: string): Observable<AtsGrupoProyectoPublicoDto> {
    return this.http.get<AtsGrupoProyectoPublicoDto>(`${this.base}/grupo/publico/proyecto/${tokenProyecto}/resumen`);
  }

  getInitPublico(tokenProyecto: string, body: AtsGrupoInitPublicoRequestDto): Observable<AtsInitDto> {
    return this.http.post<AtsInitDto>(`${this.base}/grupo/publico/proyecto/${tokenProyecto}/init`, body);
  }

  crearGrupoPublico(tokenProyecto: string, body: AtsGrupoCrearPublicoRequestDto): Observable<AtsGrupoCrearResponseDto> {
    return this.http.post<AtsGrupoCrearResponseDto>(`${this.base}/grupo/publico/proyecto/${tokenProyecto}/crear`, body);
  }
}
