import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { SupabaseService } from '../supabase/supabase.service';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: 'gpt-4o' | 'o3';
  userId?: string; // optional Supabase user id
  chatId?: string; // existing chat id (if continuing a thread)
}

@Injectable()
export class ChatService {
  private readonly openai: OpenAI;

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Send the conversation to OpenAI and (optionally) persist the messages.
   *
   * @param messages Existing conversation including the newest user message.
   * @param options  Chat options such as model, userId, chatId.
   */
  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): Promise<string> {
    // 1. Call OpenAI
    const model = options.model ?? 'gpt-4o';
    const completion = await this.openai.chat.completions.create({
      model,
      messages,
    });

    const assistantMessage = completion.choices[0].message;

    // 2. Optionally persist to Supabase (only for logged-in users)
    if (options.userId) {
      // Derive a conversation title from the first user message (fallback to generic)
      const firstUserMsg = messages.find((m) => m.role === 'user') ?? messages[0];
      const title = firstUserMsg?.content?.slice(0, 25) ?? 'New chat';

      const { chatId } = await this.ensureChatRecord(options.chatId, options.userId, title);

      // Persist both the user message (assumed to be last in array) and assistant reply
      const latestUserMessage = messages[messages.length - 1] as ChatMessage;
      await this.supabase.getClient().from('messages').insert([
        {
          chat_id: chatId,
          role: latestUserMessage.role,
          content: latestUserMessage.content,
          model,
        },
        {
          chat_id: chatId,
          role: assistantMessage.role,
          content: assistantMessage.content,
          model,
        },
      ]);
    }

    return assistantMessage.content ?? '';
  }

  /**
   * Return all chats for a given user (latest first).
   */
  async listChats(userId: string): Promise<Array<{ id: string; title: string | null; created_at: string }>> {
    const { data, error } = await this.supabase
      .getClient()
      .from('chats')
      .select('id, title, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data as Array<{ id: string; title: string | null; created_at: string }>;
  }

  /**
   * Return the messages for a given chat (oldest → newest).
   */
  async listMessages(chatId: string, userId: string): Promise<Array<{ role: string; content: string; model: string | null; created_at: string }>> {
    const { data, error } = await this.supabase
      .getClient()
      .from('messages')
      .select('role, content, model, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data as Array<{ role: string; content: string; model: string | null; created_at: string }>;
  }

  /**
   * Stream the assistant reply token-by-token. Yields every new chunk while still
   * accumulating the full answer so we can persist it afterwards.
   */
  async *chatStream(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): AsyncGenerator<string> {
    const model = options.model ?? 'gpt-4o';

    // 1. Call OpenAI in streaming mode
    const stream = await this.openai.chat.completions.create({
      model,
      messages,
      stream: true,
    });

    let fullAnswer = '';

    for await (const part of stream) {
      const token = part.choices[0]?.delta?.content ?? '';
      if (token) {
        fullAnswer += token;
        yield token;
      }
    }

    // 2. Persist conversation once stream finished (if logged in)
    await this.persistIfNeeded(messages, fullAnswer, options);
  }

  /**
   * Shared helper to store both the user's last message and the assistant reply
   * when a user is authenticated.
   */
  private async persistIfNeeded(
    messages: ChatMessage[],
    assistantContent: string,
    options: ChatOptions,
  ) {
    if (!options.userId) return;

    const model = options.model ?? 'gpt-4o';

    const firstUserMsg = messages.find((m) => m.role === 'user') ?? messages[0];
    const title = firstUserMsg?.content?.slice(0, 25) ?? 'New chat';

    const { chatId } = await this.ensureChatRecord(options.chatId, options.userId, title);

    const latestUserMessage = messages[messages.length - 1] as ChatMessage;
    await this.supabase.getClient().from('messages').insert([
      {
        chat_id: chatId,
        role: latestUserMessage.role,
        content: latestUserMessage.content,
        model,
      },
      {
        chat_id: chatId,
        role: 'assistant',
        content: assistantContent,
        model,
      },
    ]);
  }

  private async ensureChatRecord(
    chatId: string | undefined,
    userId: string,
    title?: string,
  ): Promise<{ chatId: string }> {
    const client = this.supabase.getClient();

    if (chatId) {
      return { chatId };
    }

    const { data, error } = await client
      .from('chats')
      // Store optional title; chat row only groups a thread per user.
      .insert([{ user_id: userId, title: title ?? 'New chat' }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { chatId: data.id };
  }

  async renameChat(chatId: string, userId: string, title: string): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('chats')
      .update({ title })
      .eq('id', chatId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }

  /**
   * Delete a chat (and cascaded messages) for the given user.
   */
  async deleteChat(chatId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('chats')
      .delete()
      .eq('id', chatId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }
}
