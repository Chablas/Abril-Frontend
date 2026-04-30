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
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { SharepointUploadService } from '../../../features/habilitacion/services/sharepoint-upload.service';
import { ErrorService } from '../../../core/services/error.service';

type VisorTipo = 'pdf' | 'img' | 'office' | 'no-preview';

const PDF_EXTS = ['pdf'];
const IMG_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const OFFICE_EXTS = ['docx', 'xlsx', 'pptx', 'doc', 'xls'];

@Component({
  selector: 'app-document-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-viewer.html',
  styleUrl: './document-viewer.css',
})
export class DocumentViewer implements OnChanges, OnDestroy {
  @Input() archivoUrl = '';
  @Input() nombre = '';
  @Output() closed = new EventEmitter<void>();

  isOpen = false;
  loading = false;
  tipo: VisorTipo | null = null;
  safeUrl: SafeResourceUrl | null = null;
  imgUrl = '';
  tempUrl = '';
  nombreDisplay = '';

  constructor(
    private sharepointService: SharepointUploadService,
    private sanitizer: DomSanitizer,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['archivoUrl']) {
      const url = changes['archivoUrl'].currentValue as string;
      if (url) {
        this.nombreDisplay = this.nombre || this.derivarNombre(url);
        this.abrir(url);
      } else {
        this.reset();
      }
    }
    if (changes['nombre']?.currentValue && this.isOpen) {
      this.nombreDisplay = changes['nombre'].currentValue as string;
    }
  }

  ngOnDestroy(): void {
    this.reset();
  }

  close(): void {
    this.reset();
    this.closed.emit();
  }

  descargar(): void {
    if (!this.tempUrl) return;
    const a = document.createElement('a');
    a.href = this.tempUrl;
    a.download = this.nombreDisplay;
    a.click();
  }

  private abrir(archivoUrl: string): void {
    const ext = archivoUrl.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
    this.tipo = this.detectarTipo(ext);
    this.loading = true;
    this.isOpen = true;
    this.safeUrl = null;
    this.imgUrl = '';
    this.tempUrl = '';

    this.sharepointService.getArchivoUrl(archivoUrl).subscribe({
      next: (res) => {
        this.tempUrl = res.url;
        if (this.tipo === 'pdf') {
          this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(res.url);
        } else if (this.tipo === 'img') {
          this.imgUrl = res.url;
        } else if (this.tipo === 'office') {
          const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(res.url)}`;
          this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(officeUrl);
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.isOpen = false;
        this.errorService.handleError(err);
        this.closed.emit();
        this.cdr.detectChanges();
      },
    });
  }

  private reset(): void {
    this.isOpen = false;
    this.loading = false;
    this.tipo = null;
    this.safeUrl = null;
    this.imgUrl = '';
    this.tempUrl = '';
  }

  private detectarTipo(ext: string): VisorTipo {
    if (PDF_EXTS.includes(ext)) return 'pdf';
    if (IMG_EXTS.includes(ext)) return 'img';
    if (OFFICE_EXTS.includes(ext)) return 'office';
    return 'no-preview';
  }

  derivarNombre(url: string): string {
    return url.split('/').pop()?.replace(/^\d{8}_/, '') ?? 'documento';
  }
}
