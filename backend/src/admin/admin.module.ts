import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [AdminController],
})
export class AdminModule {} 