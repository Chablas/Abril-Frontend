export interface ResidentReportIncidenceDTO {
    residentReportIncidenceId: number;
    residentReportIncidenceDescription: string;
    projectId: number;
    projectDescription: string;
    stateId: number;
    stateDescription: string;
    images: ResidentReportIncidenceImageDTO[];
}

interface ResidentReportIncidenceImageDTO {
    imageUrl: string;
}