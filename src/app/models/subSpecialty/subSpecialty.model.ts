export interface SubSpecialtyGetDTO {
    subSpecialtyId: number;
    subSpecialtyDescription: string;
    createdDateTime: string;
    createdUserId: number;
    updatedDateTime?: string;
    updatedUserId?: number;
    active: boolean;
}