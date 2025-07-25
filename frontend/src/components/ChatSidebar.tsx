import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabaseClient';

export interface ChatSummary {
  id: string;
  title: string | null;
  created_at: string;
}

interface ChatSidebarProps {
  backendUrl: string;
  onSelectChat: (chat: ChatSummary) => void;
  selectedChatId?: string;
  reloadKey?: number; // increments to trigger refetch
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ backendUrl, onSelectChat, selectedChatId, reloadKey }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchChats = async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const res = await fetch(`${backendUrl}/chat`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error(`Failed to fetch chats: ${res.status}`);
        const data = await res.json();
        setChats(data.chats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, [user, backendUrl, reloadKey]);

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  if (!user) {
    return (
      <aside className="w-64 border-r p-4 text-sm text-gray-500">Log in to save and view chats.</aside>
    );
  }

  return (
    <aside className="w-64 border-r overflow-y-auto p-4 bg-white">
      <h2 className="text-lg font-semibold mb-4">Conversations</h2>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul className="space-y-2">
          {chats.map((chat) => (
            <li key={chat.id}>
              <button
                onClick={() => onSelectChat(chat)}
                className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition truncate ${
                  selectedChatId === chat.id ? 'bg-gray-200 font-medium' : ''
                }`}
              >
                {chat.title || 'Untitled conversation'}
              </button>
            </li>
          ))}
          {chats.length === 0 && <p className="text-sm text-gray-500">No conversations yet.</p>}
        </ul>
      )}
    </aside>
  );
};

export default ChatSidebar; 