import { Body, Controller, Post, UseGuards, BadRequestException, ParseUUIDPipe, Get, Param } from '@nestjs/common';
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

  /**
   * GET /admin/users – list all users with their email and role.
   */
  @Roles('admin')
  @Get('users')
  async listUsers() {
    const { data, error } = await this.supabase
      .getClient()
      .from('profile')
      .select('id, email, role')
      .order('email', { ascending: true });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { users: data };
  }

  /**
   * GET /admin/users/:id/chats – list chats for a given user.
   */
  @Roles('admin')
  @Get('users/:id/chats')
  async listUserChats(@Param('id', ParseUUIDPipe) id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('chats')
      .select('id, title, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { chats: data };
  }

  /**
   * GET /admin/chats/:chatId/messages – list messages for a chat.
   */
  @Roles('admin')
  @Get('chats/:chatId/messages')
  async listChatMessages(@Param('chatId', ParseUUIDPipe) chatId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('messages')
      .select('role, content, model, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { messages: data };
  }


}
