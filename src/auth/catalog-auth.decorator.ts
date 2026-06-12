import { SetMetadata } from '@nestjs/common';

export const CATALOG_ROLES_KEY = 'catalog:roles';

export const RequireCatalogRoles = (...roles: string[]) =>
  SetMetadata(CATALOG_ROLES_KEY, roles);

