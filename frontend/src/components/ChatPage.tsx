import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import ChatSidebar from './ChatSidebar';
import type { ChatSummary } from './ChatSidebar';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000/api';

const ChatPage = () => {
  const { user, signOut } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<'gpt-4o' | 'o3'>('gpt-4o');

  // Increment this to tell the sidebar to refresh its chat list
  const [chatListVersion, setChatListVersion] = useState(0);

  // Current chat context (undefined means new conversation)
  const [currentChat, setCurrentChat] = useState<ChatSummary | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Helper to determine if conversation is empty
  const isConversationEmpty = messages.length === 0;

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build headers (including optional JWT)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      };
      if (user) {
        const token = await getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }

      // Initiate streaming request
      const res = await fetch(`${backendUrl}/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: [...messages, userMessage], model, chatId: currentChat?.id }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Error: ${res.status}`);
      }

      // Add a placeholder assistant message we will fill as we stream
      let assistantIndex = -1;
      setMessages((prev) => {
        assistantIndex = prev.length;
        return [...prev, { role: 'assistant', content: '' }];
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split on double newlines which mark SSE event boundaries
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.startsWith('data:')) continue;
          const data = part.replace(/^data:/, '');

          if (data === '[DONE]') {
            break;
          }

          // Update assistant message incrementally
          setMessages((prev) => {
            const next = [...prev];
            const existing = next[assistantIndex];
            if (existing && existing.role === 'assistant') {
              const decoded = data.replace(/\\n/g, '\n');
              next[assistantIndex] = { ...existing, content: existing.content + decoded };
            }
            return next;
          });
        }
      }

      // If this was a brand-new conversation (no chatId yet), fetch latest chats to obtain the newly created chat id
      if (!currentChat && user) {
        try {
          const token = await getAccessToken();
          const resChats = await fetch(`${backendUrl}/chat`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (resChats.ok) {
            const data = await resChats.json();
            if (data.chats && data.chats.length > 0) {
              const newest = data.chats[0]; // chats are ordered newest first by backend
              setCurrentChat(newest);
              setChatListVersion((v) => v + 1);
            }
          }
        } catch (err) {
          console.error('Failed to refresh chat list', err);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Extracted input area so we can reuse it in two places (center/ footer)
  type InputVariant = 'center' | 'footer';

  const renderInputArea = (variant: InputVariant = 'footer') => {
    if (variant === 'center') {
      return (
        <div className="w-full mx-auto max-w-3xl flex flex-col items-stretch gap-3">
          {/* Textarea */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask anything"
            className="flex-1 resize-none border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Buttons row under textarea */}
          <div className="flex justify-start gap-4">
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 px-2"
              title="Attach"
            >
              <span>📎</span>
              <span>Attach</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 px-2"
              title="Search"
            >
              <span>🔍</span>
              <span>Search</span>
            </button>
          </div>
        </div>
      );
    }

    // Footer variant (default)
    return (
      <div className="w-full mx-auto max-w-xl flex items-stretch gap-2">
        {/* Attach / Search icons (compact) */}
        <button
          type="button"
          className="text-gray-500 hover:text-gray-700 px-1"
          title="Attach"
        >
          📎
        </button>
        <button
          type="button"
          className="text-gray-500 hover:text-gray-700 px-1"
          title="Search"
        >
          🔍
        </button>

        {/* Text input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Send a message"
          className="flex-1 resize-none border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Send button */}
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          className={`px-4 py-2 rounded text-white font-medium transition ${
            isLoading || !input.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          Send
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <ChatSidebar
        backendUrl={backendUrl}
        reloadKey={chatListVersion}
        selectedChatId={currentChat?.id}
        onSelectChat={async (chat) => {
          setCurrentChat(chat);
          setMessages([]);

          try {
            const token = await getAccessToken();
            const res = await fetch(`${backendUrl}/chat/${chat.id}/messages`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`);
            const data = await res.json();
            const mapped: ChatMessage[] = data.messages.map((m: any) => ({ role: m.role, content: m.content }));
            setMessages(mapped);
          } catch (err) {
            console.error(err);
          }
        }}
        onChatDeleted={(id) => {
          if (currentChat?.id === id) {
            setCurrentChat(null);
            setMessages([]);
          }
          setChatListVersion((v) => v + 1);
        }}
        onNewChat={() => {
          setCurrentChat(null);
          setMessages([]);
        }}
        onChatRenamed={(chat) => {
          if (currentChat?.id === chat.id) {
            setCurrentChat(chat);
          }
          setChatListVersion((v) => v + 1);
        }}
      />

      {/* Main panel */}
      <div className="flex flex-col flex-1">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-200">
        {/* Left: brand + (optional) model selector */}
        <div className="flex items-center gap-4">
          <div className="font-semibold text-lg">SafarGPT</div>
          {user ? (
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as 'gpt-4o' | 'o3')}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="gpt-4o">gpt-4o</option>
              <option value="o3">o3</option>
            </select>
          ) : (
            <span className="text-xs text-gray-500">Not logged in – chats won’t be saved.</span>
          )}
        </div>

        {/* Right: auth controls */}
        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button onClick={signOut} className="text-xs text-blue-600 hover:underline">Sign out</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
            >
              Sign up
            </Link>
          </div>
        )}
      </header>

      {/* Messages / Empty state area */}
      <main
        className={`flex-1 overflow-y-auto bg-gray-50 p-4 ${
          isConversationEmpty ? 'flex' : ''
        }`}
      >
        {isConversationEmpty ? (
          // Centered state with brand heading and styled container
          <div className="m-auto w-full flex flex-col items-center gap-6">
            <h1 className="text-4xl font-semibold">SafarGPT</h1>
            <div className="w-full px-4">
              <div className="bg-gray-100 border rounded-xl p-6 shadow max-w-xl mx-auto">
                {renderInputArea('center')}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div key={idx} className={`max-w-xl mx-auto mb-4 ${msg.role === 'user' ? 'text-right' : ''}`}>
                <div
                  className={`inline-block px-4 py-2 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white whitespace-pre-wrap text-left'
                      : 'bg-white border text-gray-800'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown className="prose prose-slate dark:prose-invert max-w-none">
                      {msg.content ? msg.content : '...'}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </main>

      {/* Input footer (only show once conversation has started) */}
      {!isConversationEmpty && (
        <footer className="p-4 border-t border-gray-200 bg-white">{renderInputArea()}</footer>
      )}

      </div>
    </div>
  );
};

export default ChatPage; 