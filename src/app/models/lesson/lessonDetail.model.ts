export interface LessonDetailDTO {
    lessonId: number;
    lessonCode?: string;
    period: string;
    problemDescription?: string;
    reasonDescription?: string;
    lessonDescription?: string;
    impactDescription?: string;

    projectId?: number;
    projectDescription?: string;

    areaId: number;
    areaDescription: string;

    phaseStageSubStageSubSpecialtyId?: number;
    phaseId?: number;
    phaseDescription?: string;
    stageId?: number;
    stageDescription?: string;
    subStageId?: number;
    subStageDescription?: string;
    subSpecialtyId: number;
    subSpecialtyDescription: string;

    stateId: number;
    stateDescription: string;
    images?: LessonImageDTO[];

    createdDateTime: string;
    createdUserId: number;
    createdUserFullName: string;
    updatedDateTime?: string;
    updatedUserId?: number;
    active: boolean;
}

export interface LessonImageDTO {
    lessonImageId: number;
    imageUrl: string;
    lessonId: number;
    imageTypeId: number;
    imageTypeDescription: string;
}