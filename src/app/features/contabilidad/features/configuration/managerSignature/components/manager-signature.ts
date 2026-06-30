import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { ManagerSignatureService } from '../services/manager-signature.service';
import { ManagerSignatureDto } from '../dtos/manager-signature.dto';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

/**
 * Subsección "Firma de Gerente General" de la Configuración de Contabilidad.
 * Permite dibujar una firma con el mouse (o táctil) en un canvas y guardarla. Esa firma se
 * estampa luego en los documentos firmados de las facturas. Es un único registro (singleton).
 */
@Component({
  selector: 'app-manager-signature',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manager-signature.html',
})
export class ManagerSignature implements OnInit, AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  current: ManagerSignatureDto | null = null;
  hasDrawing = false;

  private ctx!: CanvasRenderingContext2D;
  private drawing = false;
  private lastX = 0;
  private lastY = 0;

  constructor(
    private service: ManagerSignatureService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#111111';
  }

  load(): void {
    this.loaderService.show();
    this.service.getSingleton().subscribe({
      next: (res) => {
        this.current = res;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  // ── Dibujo ──────────────────────────────────────────────────────────
  private pos(e: PointerEvent): { x: number; y: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  onPointerDown(e: PointerEvent): void {
    e.preventDefault();
    this.canvasRef.nativeElement.setPointerCapture(e.pointerId);
    const p = this.pos(e);
    this.drawing = true;
    this.lastX = p.x;
    this.lastY = p.y;
    // Un punto/clic simple deja una marca.
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, this.ctx.lineWidth / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = '#111111';
    this.ctx.fill();
    this.hasDrawing = true;
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.drawing) return;
    e.preventDefault();
    const p = this.pos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
    this.lastX = p.x;
    this.lastY = p.y;
  }

  onPointerUp(): void {
    this.drawing = false;
  }

  clear(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.hasDrawing = false;
  }

  save(): void {
    if (!this.hasDrawing) {
      Swal.fire({ icon: 'warning', title: 'Firma vacía', text: 'Dibuja la firma antes de guardar.' });
      return;
    }

    const dataUrl = this.canvasRef.nativeElement.toDataURL('image/png');
    this.loaderService.show();
    this.service.save(dataUrl).subscribe({
      next: (res) => {
        this.current = res;
        this.hasDrawing = false;
        this.clear();
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Firma guardada', timer: 1500, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
