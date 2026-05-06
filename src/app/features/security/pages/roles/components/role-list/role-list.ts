import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RoleFeatureService } from '../../services/role.service';
import { RoleDto } from '../../dtos/role.model';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';


@Component({
  selector: 'app-role-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './role-list.html',
  styleUrl: './role-list.css',
})
export class RoleList implements OnInit {
  tableData: PagedResponseDTO<RoleDto> = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };

  searchTerm = '';

  @Output() pagedData = new EventEmitter<PagedResponseDTO<RoleDto>>();
  @Output() editRole = new EventEmitter<RoleDto>();

  constructor(
    private roleService: RoleFeatureService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.loadRoles());
  }

  get filteredData(): RoleDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.tableData.data;
    return this.tableData.data.filter((r) => r.roleDescription.toLowerCase().includes(term));
  }

  loadRoles(page: number = 1) {
    this.loaderService.show();
    this.roleService.getRolesPaged(page).subscribe({
      next: (response) => {
        this.tableData = response;
        this.pagedData.emit(response);
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }
}
