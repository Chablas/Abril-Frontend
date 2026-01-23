export interface PhaseGetDTO {
    phaseId: number;
    phaseDescription: string;
    createdDateTime: string;
    createdUserId: number;
    updatedDateTime?: string;
    updatedUserId?: number;
    active: boolean;
}