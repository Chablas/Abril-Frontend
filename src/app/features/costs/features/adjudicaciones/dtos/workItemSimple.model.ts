export interface WorkItemValorizationFormSimpleDTO {
    concept: string;
    percentage: number;
    sortOrder: number;
}

export interface WorkItemSimpleDTO {
    workItemId: number;
    workItemDescription: string;
    valorizationForms: WorkItemValorizationFormSimpleDTO[];
}
