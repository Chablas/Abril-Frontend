export interface WorkerRevisorItemDTO {
  workerId: number;
  fullName?: string;
  email?: string;
  jefeWorkerId: number | null;
  jefeFullName?: string;
  jefeEmail?: string;
}

export interface WorkerRevisorOptionDTO {
  workerId: number;
  fullName?: string;
  email?: string;
}

export interface WorkerRevisorUpdateDTO {
  jefeWorkerId: number | null;
}
