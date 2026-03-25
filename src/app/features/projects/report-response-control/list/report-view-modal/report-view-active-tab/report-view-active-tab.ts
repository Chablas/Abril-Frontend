import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input } from '@angular/core';

@Component({
  selector: 'app-report-view-active-tab',
  imports: [CommonModule],
  templateUrl: './report-view-active-tab.html',
  styleUrl: './report-view-active-tab.css',
})
export class ReportViewActiveTab {
  @Input() tabs: { key: string; label: string }[] = [];
  @Input() activeTab: string = '';
  @Output() tabChange = new EventEmitter<string>();

  onTabChange(tab: string) {
    this.activeTab = tab;
    this.tabChange.emit(tab);
  }
}
