export interface ProjectGetDTO {
    projectId: number;
    projectDescription: string;
    levelDescription?: string;
    residentFullNames: string[];
    createdDateTime: string;
    createdUserId: number;
    updatedDateTime?: string;
    updatedUserId?: number;
    active: boolean;
}