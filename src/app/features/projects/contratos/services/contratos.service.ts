import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import {
  ApiMessage,
  ContratoCatalogosDTO,
  ContributorLookupDTO,
  ProjectContractCreateDTO,
  ProjectContractCreatedDTO,
  ProjectContractDTO,
  ProjectContractEditDTO,
  ProjectContractFolderDTO,
  ProjectContractFolderSaveDTO,
  ProjectContractMilestoneCreateDTO,
  ProjectContractMilestoneDTO,
  ProjectContractMilestonePaymentDTO,
  ProjectContractScannedDocDTO,
  ProjectContractStep5ArrivalDTO,
  ProjectContractStep6SignaturesDTO,
} from '../dtos/contrato.dtos';

function buildAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ContratoDocumento {
  blob: Blob;
  /** null si el backend no expone Content-Disposition (CORS) — el llamador arma uno por defecto. */
  fileName: string | null;
}

@Injectable({ providedIn: 'root' })
export class ContratosService {
  private readonly base = `${environment.apiUrl}api/v1/projectcontract`;
  /** Catálogos reutilizados de Adjudicaciones (ver ContratoCatalogosDTO). */
  private readonly catalogosUrl = `${environment.apiUrl}api/v1/projectSubContractor/form-data`;
  private readonly lookupUrl = `${environment.apiUrl}api/v1/project/company-lookup`;

  constructor(private http: HttpClient) {}

  getCatalogos(): Observable<ContratoCatalogosDTO> {
    return this.http.get<ContratoCatalogosDTO>(this.catalogosUrl, { headers: buildAuthHeaders() });
  }

  /**
   * Busca el contratista por RUC (Sunat) y lo registra si todavía no existe en el sistema. Es el
   * mismo endpoint que usa Configuración → Proyectos para la razón social del proyecto.
   * 404 = el RUC no existe ni en el sistema ni en Sunat.
   */
  buscarContribuyentePorRuc(ruc: string): Observable<ContributorLookupDTO> {
    return this.http.get<ContributorLookupDTO>(`${this.lookupUrl}/${encodeURIComponent(ruc)}`, {
      headers: buildAuthHeaders(),
    });
  }

  // ── Configuración: carpeta de SharePoint ───────────────────────────────────

  getCarpeta(projectId: number): Observable<ProjectContractFolderDTO | null> {
    return this.http.get<ProjectContractFolderDTO | null>(`${this.base}/carpeta`, {
      params: { projectId },
      headers: buildAuthHeaders(),
    });
  }

  guardarCarpeta(projectId: number, dto: ProjectContractFolderSaveDTO): Observable<ProjectContractFolderDTO> {
    return this.http.post<ProjectContractFolderDTO>(`${this.base}/carpeta`, dto, {
      params: { projectId },
      headers: buildAuthHeaders(),
    });
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  getByProject(projectId: number): Observable<ProjectContractDTO[]> {
    return this.http.get<ProjectContractDTO[]>(this.base, {
      params: { projectId },
      headers: buildAuthHeaders(),
    });
  }

  getById(projectContractId: number): Observable<ProjectContractDTO> {
    return this.http.get<ProjectContractDTO>(`${this.base}/${projectContractId}`, {
      headers: buildAuthHeaders(),
    });
  }

  crear(dto: ProjectContractCreateDTO): Observable<ProjectContractCreatedDTO> {
    return this.http.post<ProjectContractCreatedDTO>(this.base, dto, { headers: buildAuthHeaders() });
  }

  editar(projectContractId: number, dto: ProjectContractEditDTO): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(`${this.base}/${projectContractId}`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  // ── Hitos de pago ───────────────────────────────────────────────────────────

  /** Devuelve la lista completa de hitos del contrato, recalculada (monto y garantía). */
  agregarHito(
    projectContractId: number,
    dto: ProjectContractMilestoneCreateDTO,
  ): Observable<ProjectContractMilestoneDTO[]> {
    return this.http.post<ProjectContractMilestoneDTO[]>(`${this.base}/${projectContractId}/hitos`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  /** Devuelve la lista completa de hitos que quedan, recalculada. */
  eliminarHito(projectContractMilestoneId: number): Observable<ProjectContractMilestoneDTO[]> {
    return this.http.delete<ProjectContractMilestoneDTO[]>(`${this.base}/hitos/${projectContractMilestoneId}`, {
      headers: buildAuthHeaders(),
    });
  }

  /** Registra el pago de un hito ya creado. Devuelve el hito actualizado. */
  registrarPagoHito(
    projectContractMilestoneId: number,
    dto: ProjectContractMilestonePaymentDTO,
  ): Observable<ProjectContractMilestoneDTO> {
    return this.http.patch<ProjectContractMilestoneDTO>(
      `${this.base}/hitos/${projectContractMilestoneId}/pago`,
      dto,
      { headers: buildAuthHeaders() },
    );
  }

  // ── Paso 3: generar el .docx ────────────────────────────────────────────────

  /**
   * Genera el contrato (.docx) y lo devuelve para descargar; si el proyecto ya tiene carpeta de
   * SharePoint configurada, el backend además lo sube ahí. En error el body llega como Blob (por
   * el responseType), así que se re-parsea a JSON para que `error.message` funcione igual que en
   * cualquier otro endpoint (ErrorService lee `err.error?.message`).
   */
  generarContrato(projectContractId: number): Observable<ContratoDocumento> {
    return this.http
      .post(`${this.base}/${projectContractId}/generar-contrato`, null, {
        headers: buildAuthHeaders(),
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((res: HttpResponse<Blob>) => ({
          blob: res.body ?? new Blob(),
          fileName: this.fileNameFromHeader(res.headers.get('Content-Disposition')),
        })),
        catchError((err: HttpErrorResponse) => this.blobErrorToJson(err)),
      );
  }

  // ── Pasos 4-9 ───────────────────────────────────────────────────────────────

  /** Paso 4: envía el contrato por correo al contratista, o solo registra que ya se envió afuera. */
  enviarAlContratista(projectContractId: number, skipNotification: boolean): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.base}/${projectContractId}/paso4-enviar`, null, {
      params: { skipNotification },
      headers: buildAuthHeaders(),
    });
  }

  registrarLlegada(projectContractId: number, dto: ProjectContractStep5ArrivalDTO): Observable<ApiMessage> {
    return this.http.patch<ApiMessage>(`${this.base}/${projectContractId}/paso5-llegada`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  actualizarFirmas(projectContractId: number, dto: ProjectContractStep6SignaturesDTO): Observable<ApiMessage> {
    return this.http.patch<ApiMessage>(`${this.base}/${projectContractId}/paso6-firmas`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  /** Paso 7: sube el contrato firmado escaneado al slot 1, 2 o 3 (mismo slot = reemplaza). */
  subirEscaneo(projectContractId: number, slot: number, file: File): Observable<ProjectContractScannedDocDTO> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<ProjectContractScannedDocDTO>(
      `${this.base}/${projectContractId}/paso7-escaneo/${slot}`,
      form,
      { headers: buildAuthHeaders() },
    );
  }

  notificarUnidadDeProyectos(projectContractId: number): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.base}/${projectContractId}/paso8-notificar`, null, {
      headers: buildAuthHeaders(),
    });
  }

  cerrar(projectContractId: number): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.base}/${projectContractId}/paso9-cerrar`, null, {
      headers: buildAuthHeaders(),
    });
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  private fileNameFromHeader(header: string | null): string | null {
    if (!header) return null;
    const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
    if (utf8) return decodeURIComponent(utf8[1].trim());
    const plain = /filename="?([^";]+)"?/i.exec(header);
    return plain ? plain[1].trim() : null;
  }

  private blobErrorToJson(err: HttpErrorResponse): Observable<never> {
    if (!(err.error instanceof Blob)) return throwError(() => err);
    return from(err.error.text()).pipe(
      switchMap((text) => {
        let body: unknown = null;
        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          body = null;
        }
        return throwError(
          () =>
            new HttpErrorResponse({
              error: body,
              headers: err.headers,
              status: err.status,
              statusText: err.statusText,
              url: err.url ?? undefined,
            }),
        );
      }),
    );
  }
}
