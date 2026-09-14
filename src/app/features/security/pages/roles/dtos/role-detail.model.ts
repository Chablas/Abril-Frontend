import { AccessFeatureDto, AccessUserDto } from '../../../shared/dtos/access.dto';

/** Detalle de un rol: los usuarios que lo tienen y las funcionalidades que da. */
export interface RoleDetailDto {
  roleId: number;
  roleDescription: string;
  users: AccessUserDto[];
  features: AccessFeatureDto[];
}
