import { Body, Controller, Post, UseGuards, BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Promote a user to admin.
   * Body: { userId: string }
   */
  @Roles('admin')
  @Post('promote')
  async promoteUser(@Body('userId', ParseUUIDPipe) userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('profile')
      .update({ role: 'admin' })
      .eq('id', userId)
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: `User ${userId} promoted to admin`, data };
  }

  /**
   * Demote an admin back to regular user.
   * Body: { userId: string }
   */
  @Roles('admin')
  @Post('demote')
  async demoteUser(@Body('userId', ParseUUIDPipe) userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('profile')
      .update({ role: 'user' })
      .eq('id', userId)
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: `User ${userId} demoted to user`, data };
  }
}
