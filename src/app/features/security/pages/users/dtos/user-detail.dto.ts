import { AccessFeatureDto, AccessRoleDto } from '../../../shared/dtos/access.dto';

/** Detalle de un usuario: sus roles y las funcionalidades a las que accede por ellos. */
export interface UserDetailDto {
  userId: number;
  email: string;
  displayName: string | null;
  documentIdentityCode: string | null;
  userType: 'PERSONA' | 'COLABORADOR' | 'CONTRATISTA';
  active: boolean;
  roles: AccessRoleDto[];
  /** Cada funcionalidad una vez, con todos los roles que se la dan. */
  features: AccessFeatureDto[];
}
