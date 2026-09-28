import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../../environments/environment';

interface AtsVerificacionPublicaDto {
  valido: boolean;
  encontrado: boolean;
  workerNombre?: string;
  proyectoNombre?: string;
  actividad?: string;
  fecha?: string;
  horaServidorFirma?: string;
  estado?: string;
}

/// Página PÚBLICA (sin login) a la que apunta el QR impreso en el PDF del ATS — un inspector de
/// SUNAFIL o cualquiera con el link puede confirmar que el documento que tiene en mano corresponde
/// exactamente a lo firmado en el sistema, comparando el hash. Mismo patrón que pets-publico.
@Component({
  selector: 'app-ats-verificar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ats-verificar.html',
  styleUrl: './ats-verificar.css',
})
export class AtsVerificar implements OnInit {
  cargando = true;
  resultado: AtsVerificacionPublicaDto | null = null;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const hash = this.route.snapshot.queryParamMap.get('hash') ?? '';
    if (!id) {
      this.cargando = false;
      this.error = true;
      this.cdr.detectChanges();
      return;
    }

    const url = `${environment.apiUrl}api/v1/ssoma/ats/${id}/verificar-publico?hash=${encodeURIComponent(hash)}`;
    this.http.get<AtsVerificacionPublicaDto>(url).subscribe({
      next: (res) => {
        this.resultado = res;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = true;
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }
}
