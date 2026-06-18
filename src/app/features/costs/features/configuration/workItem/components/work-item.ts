import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { WorkItemList } from './list/list';
import { WorkItemCreate } from './create/create';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { WorkItemFilterDto } from '../dtos/work-item-filter.dto';
import { WorkItemDto } from '../dtos/work-item.dto';
import { WorkItemService } from '../services/work-item.service';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-work-item',
  standalone: true,
  imports: [CommonModule, FormsModule, WorkItemList, WorkItemCreate, Paginator, AbrilPageHeaderComponent],
  templateUrl: './work-item.html',
  styleUrl: './work-item.css',
})
export class WorkItem implements OnInit {
  @ViewChild(WorkItemList) list!: WorkItemList;

  filters: WorkItemFilterDto = { description: null, page: 1 };

  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  showCreateModal = false;
  syncing = false;

  constructor(
    private service: WorkItemService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {}

  sync(): void {
    this.syncing = true;
    this.loaderService.show();
    this.service.sync().subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.syncing = false;
        const createdLine =
          res.created > 0
            ? `<br/><small class="text-blue-500">Nuevas: ${res.createdDescriptions.join(', ')}</small>`
            : '';
        const noFolderLine =
          res.projectsWithoutContratosFolder.length > 0
            ? `<br/><small class="text-gray-400">Sin carpeta "Contratos": ${res.projectsWithoutContratosFolder.join(', ')}</small>`
            : '';
        Swal.fire({
          icon: 'success',
          title: 'Sincronización completada',
          html: `${res.projectsScanned} proyecto(s) · ${res.created} nuevas · ${res.existing} ya registradas${createdLine}${noFolderLine}`,
          confirmButtonColor: '#64BC04',
        });
        this.list.load(1);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.syncing = false;
        this.errorService.handleError(err);
      },
    });
  }

  onSearch(): void {
    this.list.load(1);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.list.load(page);
  }

  onPagedData(data: PagedResponseDTO<WorkItemDto>): void {
    this.currentPage = data.page;
    this.totalPages = data.totalPages;
    this.totalRecords = data.totalRecords;
  }
}
