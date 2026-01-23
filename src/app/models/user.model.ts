import { PersonDTO } from "./person.model";

export interface UserDTO {
  userId: number;
  person: PersonDTO;
  createdDateTime: string;
  createdUserId: number;
  updatedDateTime?: string | null;
  updatedUserId?: number | null;
  active: boolean;
}
