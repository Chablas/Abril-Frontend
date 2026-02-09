export interface ProjectGetDTO {
    projectId : number;
    projectDescription: string;
    createdDateTime: string;
    createdUserId: number;
    updatedDateTime?: string;
    updatedUserId?: number;
    active: boolean;
}