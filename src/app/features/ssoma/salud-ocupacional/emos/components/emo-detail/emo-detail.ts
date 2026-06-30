import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { EmoService } from '../../../services/emo.service';
import {
  EmoDetalleDto,
  WorkerEmoHistorialDto,
} from '../../../dtos/emo.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { aptitudBadgeClass } from '../../../shared/aptitud.utils';
import {
  diasVencerBadgeClass,
  diasVencerStyle,
} from '../../../shared/dias-vencer.utils';

type TabKey = 'datos' | 'examenes' | 'restricciones' | 'convalidaciones' | 'clinica' | 'historial';

@Component({
  selector: 'app-emo-detail',
  standalone: true,
  imports: [CommonModule, BaseModal],
  templateUrl: './emo-detail.html',
  styleUrl: './emo-detail.css',
})
export class EmoDetail implements OnChanges, OnDestroy {
  @Input() emoId: number | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  activeTab: TabKey = 'datos';
  emo: EmoDetalleDto | null = null;
  loading = false;

  historial: WorkerEmoHistorialDto | null = null;
  historialLoading = false;
  historialLoaded = false;

  private destroyed = false;

  constructor(
    private service: EmoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['emoId'] && this.emoId) {
      this.resetState();
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
  }

  private resetState(): void {
    this.emo = null;
    this.activeTab = 'datos';
    this.historial = null;
    this.historialLoaded = false;
    this.historialLoading = false;
  }

  load(): void {
    if (!this.emoId) return;
    this.loading = true;
    this.loaderService.show();
    this.service.getEmoDetalle(this.emoId).subscribe({
      next: (res) => {
        if (this.destroyed) return;
        this.emo = res;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  setTab(tab: TabKey): void {
    this.activeTab = tab;
    if (tab === 'historial' && !this.historialLoaded && this.emo) {
      this.loadHistorial();
    }
  }

  private loadHistorial(): void {
    if (!this.emo) return;
    this.historialLoading = true;
    this.service.getHistorialWorker(this.emo.workerId).subscribe({
      next: (res) => {
        if (this.destroyed) return;
        this.historial = res;
        this.historialLoaded = true;
        this.historialLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.historialLoading = false;
        this.errorService.handleError(err);
      },
    });
  }

  irAHistorialCompleto(): void {
    if (!this.emo) return;
    this.closed.emit();
    this.router.navigate(['/ssoma/salud-ocupacional/emos', this.emo.workerId, 'historial']);
  }

  aptitudClass(aptitud: string): string {
    return aptitudBadgeClass(aptitud);
  }

  diasClass(dias: number): string {
    return diasVencerBadgeClass(dias);
  }

  diasLabel(dias: number): string {
    return diasVencerStyle(dias).label;
  }

  close(): void {
    this.closed.emit();
  }
}
