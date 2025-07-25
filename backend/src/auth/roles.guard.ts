import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../supabase/supabase.service';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // Check role claim first
    let role: string | undefined = user.role || user.app_metadata?.role;

    // If role claim is missing OR not in required roles, fetch from DB
    if ((!role || !requiredRoles.includes(role)) && user.sub) {
      try {
        const { data, error } = await this.supabase
          .getClient()
          .from('profile')
          .select('role')
          .eq('id', user.sub)
          .single();

        if (!error) {
          role = (data?.role as string | undefined) ?? role;
        }
      } catch (err) {
        // swallow
      }
    }
    if (!role) return false;

    return requiredRoles.includes(role);
  }
} 