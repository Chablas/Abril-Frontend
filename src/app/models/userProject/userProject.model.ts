
export interface UserProjectGetDTO {
    userProjectId: number;
    userId: number;
    projectId: number;
    userFullName: string;
    projectDescription: string;
    createdDateTime: string;
    createdUserId: number;
    updatedDateTime?: string;
    updatedUserId?: number;
    active: boolean;
}