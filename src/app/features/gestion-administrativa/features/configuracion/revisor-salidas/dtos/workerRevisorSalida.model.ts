export interface WorkerRevisorSalidaItemDTO {
  workerId: number;
  fullName?: string;
  email?: string;
  categoryId?: number;
  category?: string;
  jefeWorkerId?: number | null;
  jefeFullName?: string;
  jefeEmail?: string;
  jefeCategoryId?: number | null;
  jefeCategory?: string;
}

export interface WorkerRevisorSalidaOptionDTO {
  workerId: number;
  fullName?: string;
  email?: string;
}

export interface WorkerRevisorSalidaUpdateDTO {
  jefeWorkerId: number | null;
}
