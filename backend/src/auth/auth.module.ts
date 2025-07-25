import { Module } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { OptionalJwtGuard } from './optional-jwt.guard';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [JwtAuthGuard, RolesGuard, OptionalJwtGuard],
  exports: [JwtAuthGuard, RolesGuard, OptionalJwtGuard],
})
export class AuthModule {} 