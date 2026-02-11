import { Component, ElementRef, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import { gantt } from 'dhtmlx-gantt';

@Component({
  selector: 'app-milestone-schedule',
  standalone: true,
  imports: [],
  templateUrl: './milestone-schedule.html',
  styleUrl: './milestone-schedule.css',
})
export class MilestoneSchedule implements AfterViewInit, OnDestroy {
  @ViewChild('ganttContainer', { static: true })
  ganttContainer!: ElementRef;

  ngAfterViewInit(): void {
    gantt.i18n.setLocale("es");
    gantt.locale.labels.new_task = "Nuevo hito";
    gantt.config.lightbox.sections = [
      {
        name: 'description',
        type: 'textarea',
        map_to: 'text',
        height: 50,
      },
      {
        name: 'time',
        type: 'time',
        map_to: "auto",
      },
    ];
    gantt.init(this.ganttContainer.nativeElement);

    gantt.parse({
      data: [
        {
          id: 1,
          text: 'Inicio del Proyecto',
          start_date: '01-01-2026',
          end_date: "10-01-2026",
          progress: 0.6
        },
        {
          id: 2,
          text: 'Ejecución',
          start_date: '01-02-2026',
          end_date: "10-02-2026",
          progress: 0.3
        },
        {
          id: 3,
          text: 'asddsdsads',
          start_date: '01-03-2026',
          end_date: "10-03-2026",
          progress: 0.3
        },
      ],
      links: []
    });

  }

  ngOnDestroy(): void {
    gantt.clearAll();
  }
}
