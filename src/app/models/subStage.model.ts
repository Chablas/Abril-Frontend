export interface SubStageGetDTO {
    subStageId: number;
    subStageDescription: string;
    createdDateTime: string;
    createdUserId: number;
    updatedDateTime?: string;
    updatedUserId?: number;
    active: boolean;
}