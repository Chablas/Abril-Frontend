/** Hito de propietario (fijo, 9 por versión de cronograma) — solo lectura, deriva su fecha de un hito interno del cronograma. */
export interface OwnerMilestoneDTO {
    ownerMilestoneId: number;
    description: string;
    order: number;
    /** Id del hito interno (Milestone) del que sale la fecha — informativo. */
    milestoneId: number;
    /** null si esa versión del cronograma todavía no tiene cargado el hito interno correspondiente. */
    plannedStartDate: string | null;
    plannedEndDate: string | null;
}
