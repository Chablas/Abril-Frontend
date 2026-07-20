import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { LicenciaAdd } from './licencia-add/licencia-add';
import { LicenciaDetail } from './licencia-detail/licencia-detail';
import { ControlVencimientosService } from '../services/control-vencimientos.service';
import { VecinoLicenciaDTO } from '../dtos/control-vencimientos.dto';

import { VECINOS_TABS } from '../../shared/vecinos-tabs';
@Component({
  selector: 'app-control-vencimientos',
  standalone: true,
  imports: [CommonModule, AbrilPageHeaderComponent, LicenciaAdd, LicenciaDetail],
  templateUrl: './control-vencimientos.html',
})
export class ControlVencimientos implements OnInit {
  readonly tabs = VECINOS_TABS;
  licencias: VecinoLicenciaDTO[] = [];
  showAddModal = false;
  selectedLicencia: VecinoLicenciaDTO | null = null;

  constructor(
    private service: ControlVencimientosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getLicencias().subscribe({
      next: (data) => {
        this.licencias = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  openAddModal(): void {
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  onCreated(): void {
    this.showAddModal = false;
    this.load();
  }

  fileUrl(url: string): string {
    return url.startsWith('http') ? url : environment.apiUrl.replace(/\/$/, '') + url;
  }

  openDetail(item: VecinoLicenciaDTO): void {
    this.selectedLicencia = item;
  }

  closeDetail(): void {
    this.selectedLicencia = null;
  }
}
