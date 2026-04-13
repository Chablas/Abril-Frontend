import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ContractorManagementService } from '../services/contractor-management.service';
import { ContractorManagementDTO } from '../dtos/contractor-management.dto';
import { ContractorManagementList } from './list/contractor-management-list';
import { ContractorManagementCard } from './card/contractor-management-card';
import { ContractorManagementDetail } from './detail/contractor-management-detail';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { ViewToggle } from '../../../../shared/components/view-toggle/view-toggle';
import { ViewToggleMode } from '../../../../shared/components/view-toggle/view-toggle.model';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';

@Component({
  selector: 'app-contractor-management',
  standalone: true,
  imports: [
    CommonModule,
    ContractorManagementList,
    ContractorManagementCard,
    ContractorManagementDetail,
    Paginator,
    ViewToggle,
  ],
  templateUrl: './contractor-management.html',
})
export class ContractorManagement implements OnInit {
  contractors: ContractorManagementDTO[] = [];
  currentPage = 1;
  totalPages = 1;
  totalRecords = 0;

  selectedContractor: ContractorManagementDTO | null = null;
  viewMode = 'table';

  viewModes: ViewToggleMode[] = [
    {
      value: 'table',
      label: 'Tabla',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>`,
    },
    {
      value: 'card',
      label: 'Tarjetas',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    },
  ];

  constructor(
    private service: ContractorManagementService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loaderService.show();
    this.service.getPaged(page).subscribe({
      next: (res) => {
        this.contractors = res.data;
        this.currentPage = res.page;
        this.totalPages = res.totalPages;
        this.totalRecords = res.totalRecords;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  openDetail(item: ContractorManagementDTO): void {
    this.selectedContractor = item;
  }

  closeDetail(): void {
    this.selectedContractor = null;
  }
}
