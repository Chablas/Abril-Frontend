import { DocumentIdentityTypeDTO } from "../documentIdentityType/documentIdentityType.model"

export interface PersonDTO {
  personId: number;
  documentIdentityCode: string;
  documentIdentityType: DocumentIdentityTypeDTO;

  firstName: string;
  secondName: string;
  firstLastName: string;
  secondLastName: string;
  fullName: string;
  email: string;

  createdDateTime: string;
  createdUserId: number;
  updatedDateTime?: string | null;
  updatedUserId?: number | null;
  active: boolean;
}
