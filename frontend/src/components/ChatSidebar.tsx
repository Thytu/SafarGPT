import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabaseClient';
import SidebarToggleIcon from './icons/SidebarToggleIcon';

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
  onChatDeleted?: (chatId: string) => void;
  onChatRenamed?: (chat: ChatSummary) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ backendUrl, onSelectChat, selectedChatId, reloadKey, onChatDeleted, onChatRenamed }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<ChatSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = () => setMenuOpenId(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

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

  const handleRename = async (chat: ChatSummary) => {
    setEditingId(chat.id);
    setEditingValue(chat.title ?? 'Untitled conversation');
    setMenuOpenId(null);
  };

  const submitRename = async (chatId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return; // ignore empty
    try {
      const token = await getAccessToken();
      const res = await fetch(`${backendUrl}/chat/${chatId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error(`Failed to rename chat: ${res.status}`);
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title: trimmed } : c)));
      const updated = chats.find((c) => c.id === chatId);
      if (updated) onChatRenamed?.({ ...updated, title: trimmed });
    } catch (err) {
      console.error(err);
      alert('Rename failed');
    } finally {
      setEditingId(null);
    }
  };

  const openDeleteModal = (chat: ChatSummary) => {
    setDeleteTarget(chat);
    setMenuOpenId(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${backendUrl}/chat/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error(`Failed to delete chat: ${res.status}`);
      setChats((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      onChatDeleted?.(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      alert('Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <aside className="w-64 border-r p-4 text-sm text-gray-500">Log in to save and view chats.</aside>
    );
  }

  return (
    <>
    <aside className={`${collapsed ? 'w-8 p-2' : 'w-64 p-4'} border-r overflow-y-auto bg-white relative transition-all duration-200`}>
      {/* Collapse / Expand button */}
      <button
        className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <SidebarToggleIcon/>
      </button>
      {!collapsed && (
      <>
      <h2 className="text-lg font-semibold mb-4">Conversations</h2>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul className="space-y-2">
          {chats.map((chat) => (
            <li key={chat.id} className="relative">
              <div className="flex items-center">
                <button
                  onClick={() => onSelectChat(chat)}
                  className={`flex-1 text-left px-3 py-2 rounded hover:bg-gray-100 transition truncate ${
                    selectedChatId === chat.id ? 'bg-gray-200 font-medium' : ''
                  }`}
                >
                  {editingId === chat.id ? (
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => submitRename(chat.id, editingValue)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          submitRename(chat.id, editingValue);
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      className="w-full bg-transparent border border-gray-300 rounded px-1 py-0.5 text-sm"
                    />
                  ) : (
                    chat.title || 'Untitled conversation'
                  )}
                </button>
                <button
                  className="ml-1 px-2 text-gray-500 hover:text-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId((prev) => (prev === chat.id ? null : chat.id));
                  }}
                  title="More options"
                >
                  …
                </button>
                {menuOpenId === chat.id && (
                  <div
                    className="absolute right-0 top-full mt-1 w-28 bg-white border rounded shadow-md z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                      onClick={() => handleRename(chat)}
                    >
                      Rename
                    </button>
                    <button
                      className="block w-full text-left px-3 py-2 text-red-600 hover:bg-gray-100"
                      onClick={() => openDeleteModal(chat)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
          {chats.length === 0 && <p className="text-sm text-gray-500">No conversations yet.</p>}
        </ul>
      )}
      </>
      )}
    </aside>
    {deleteTarget && (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-30" onClick={() => !deleting && setDeleteTarget(null)}>
        <div className="bg-white rounded-lg shadow-lg p-6 w-80" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-3">Delete chat?</h3>
          <p className="text-sm mb-6">This will delete "{deleteTarget.title || 'Untitled conversation'}".</p>
          <div className="flex justify-end gap-2">
            <button
              className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              className={`px-3 py-1 text-sm rounded text-white ${deleting ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'}`}
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default ChatSidebar; 