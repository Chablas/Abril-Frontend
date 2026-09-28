/** Shape reducido del catálogo Milestone que devuelve GET milestoneSchedule/faltantes. */
export interface MilestoneSimpleDTO {
  milestoneId: number;
  milestoneDescription: string;
  esObligatorio: boolean;
  esPuntual: boolean;
}
