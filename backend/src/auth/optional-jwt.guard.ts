import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Guard that tries to authenticate the request using a JWT if present.
 *
 * Behaviour:
 *  • No Authorization header → allow request as anonymous (returns true)
 *  • Valid `Bearer <token>` header → decodes token and attaches it to `request.user`
 *  • Invalid token / wrong scheme → rejects the request
 */
@Injectable()
export class OptionalJwtGuard extends JwtAuthGuard {
  constructor(config: ConfigService) {
    super(config);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = (request.headers['authorization'] || request.headers['Authorization']) as
      | string
      | undefined;

    // No header → allow anonymous access
    if (!authHeader) {
      return true;
    }

    // Header present → fall back to full verification in JwtAuthGuard
    return super.canActivate(context);
  }
} 