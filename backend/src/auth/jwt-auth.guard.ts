import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = (request.headers['authorization'] || request.headers['Authorization']) as string | undefined;
    if (!authHeader) {
      return false;
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return false;
    }

    try {
      const decoded = jwt.verify(token, this.config.get<string>('SUPABASE_JWT_SECRET') as string);
      request.user = decoded;
      return true;
    } catch (err) {
      return false;
    }
  }
}
