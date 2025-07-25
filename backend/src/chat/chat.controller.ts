import { Body, Controller, Get, Post, Req, Res, UseGuards, UnauthorizedException, Param, ParseUUIDPipe } from '@nestjs/common';
import { Request, Response } from 'express';
import { ChatService, ChatMessage } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtGuard } from '../auth/optional-jwt.guard';

interface ChatRequestDto {
  messages: ChatMessage[];
  model?: 'gpt-4o' | 'o3';
  chatId?: string;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * GET /chat – return list of chats for the signed-in user.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async listChats(@Req() req: Request) {
    const userId = (req as any).user?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const chats = await this.chatService.listChats(userId);
    return { chats };
  }

  /**
   * GET /chat/:id/messages – returns message list for the given chat.
   */
  @Get(':id/messages')
  @UseGuards(JwtAuthGuard)
  async getMessages(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const messages = await this.chatService.listMessages(id, userId);
    return { messages };
  }

  @Post()
  @UseGuards(OptionalJwtGuard)
  async chat(@Body() body: ChatRequestDto, @Req() req: Request): Promise<{ answer: string }> {
    const { messages, model, chatId } = body;

    if (!messages?.length) {
      throw new Error('messages array required');
    }

    const answer = await this.chatService.chat(messages, {
      model,
      userId: (req as any).user?.sub, // assumes JWT payload has `sub`
      chatId,
    });

    return { answer };
  }

  /**
   * POST /chat/stream – Same payload as /chat but keeps the HTTP connection
   * open and sends Server-Sent Events (SSE) so the client can render tokens
   * as they are produced.
   */
  @Post('stream')
  @UseGuards(OptionalJwtGuard)
  async chatStream(@Body() body: ChatRequestDto, @Req() req: Request, @Res() res: Response) {
    const { messages, model, chatId } = body;

    if (!messages?.length) {
      throw new Error('messages array required');
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    (res as any).flushHeaders?.();

    try {
      const stream = this.chatService.chatStream(messages, {
        model,
        userId: (req as any).user?.sub,
        chatId,
      });

      for await (const token of stream) {
        // Send each token as its own SSE event
        const payload = token.replace(/\n/g, '\\n');
        res.write(`data:${payload}\n\n`);
      }

      res.write('data:[DONE]\n\n');
    } catch (err) {
      res.write(`event: error\ndata: ${(err as Error).message}\n\n`);
    } finally {
      res.end();
    }
  }
} 