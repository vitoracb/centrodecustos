import { ReactNode } from 'react';
import { usePermissions } from '@/src/context/PermissionsContext';

interface PermissionGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  require?: 'admin' | 'editor' | 'canCreate' | 'canEdit' | 'canDelete';
}

/**
 * Componente para controlar visibilidade baseado em permissões
 * 
 * Uso:
 * <PermissionGate require="canEdit">
 *   <Button>Editar</Button>
 * </PermissionGate>
 */
export function PermissionGate({ children, fallback = null, require }: PermissionGateProps) {
  const permissions = usePermissions();

  if (permissions.loading) {
    return <>{fallback}</>;
  }

  let hasPermission = false;

  switch (require) {
    case 'admin':
      hasPermission = permissions.isAdmin;
      break;
    case 'editor':
      hasPermission = permissions.isEditor || permissions.isAdmin;
      break;
    case 'canCreate':
      hasPermission = permissions.canCreate;
      break;
    case 'canEdit':
      hasPermission = permissions.canEdit;
      break;
    case 'canDelete':
      hasPermission = permissions.canDelete;
      break;
    default:
      hasPermission = true;
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}
