import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from './ToastProvider';

interface Profile {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

interface ChatSummary {
  id: string;
  title: string | null;
  created_at: string;
}

interface Message {
  role: string;
  content: string;
  model: string | null;
  created_at: string;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000/api';

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const addToast = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  // Load all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(`${backendUrl}/admin/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          throw new Error(`Failed to load users (${res.status})`);
        }
        const data = await res.json();
        setProfiles(data.users ?? []);
      } catch (err: any) {
        setError(err.message ?? 'Failed to load users');
      }
    };
    fetchUsers();
  }, [user]);

  // Load chats when selected user changes
  useEffect(() => {
    if (!selectedUser) return;
    const fetchChats = async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(`${backendUrl}/admin/users/${selectedUser.id}/chats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error(`Failed to load chats (${res.status})`);
        const data = await res.json();
        setChats(data.chats ?? []);
      } catch (err: any) {
        addToast(err.message ?? 'Error');
      }
    };
    fetchChats();
    setSelectedChat(null);
    setMessages([]);
  }, [selectedUser]);

  // Load messages when selected chat changes
  useEffect(() => {
    if (!selectedChat) return;
    const fetchMessages = async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(`${backendUrl}/admin/chats/${selectedChat.id}/messages`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error(`Failed to load messages (${res.status})`);
        const data = await res.json();
        setMessages(data.messages ?? []);
      } catch (err: any) {
        addToast(err.message ?? 'Error');
      }
    };
    fetchMessages();
  }, [selectedChat]);

  const copyChat = () => {
    if (!messages.length) return;
    const text = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
    navigator.clipboard.writeText(text);
    addToast('Chat copied to clipboard');
  };

  const copyAllChatsOfUser = () => {
    if (!chats.length) return;
    const out: string[] = [];
    chats.forEach((chat) => {
      out.push(`Chat: ${chat.title ?? chat.id}`);
    });
    navigator.clipboard.writeText(out.join('\n'));
    addToast('Chat list copied');
  };

  const changeRole = async (profile: Profile, role: 'user' | 'admin') => {
    const endpoint = role === 'admin' ? 'promote' : 'demote';
    try {
      const token = await getAccessToken();
      const res = await fetch(`${backendUrl}/admin/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: profile.id }),
      });
      if (!res.ok) throw new Error(`Failed to update role (${res.status})`);
      // refresh users list
      setProfiles((prev) =>
        prev.map((p) => (p.id === profile.id ? { ...p, role } : p)),
      );
    } catch (err: any) {
      addToast(err.message ?? 'Error');
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        {user && (
          <button onClick={signOut} className="text-blue-600 underline">
            Sign out
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Users sidebar */}
      <div className="w-64 border-r overflow-y-auto">
        <h2 className="p-4 font-semibold">Users</h2>
        <ul>
          {profiles.map((p) => (
            <li
              key={p.id}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${selectedUser?.id === p.id ? 'bg-gray-100' : ''}`}
              onClick={() => setSelectedUser(p)}
            >
              <div className="flex justify-between items-center">
                <span>{p.email}</span>
                <span className="text-xs text-gray-500">{p.role}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Chats list */}
      <div className="w-72 border-r overflow-y-auto">
        {selectedUser ? (
          <>
            <div className="p-4 border-b font-medium flex justify-between items-center">
              <span>Chats of {selectedUser.email}</span>
              <button
                className="text-xs text-blue-600 underline"
                onClick={copyAllChatsOfUser}
              >
                Copy list
              </button>
            </div>
            <ul>
              {chats.map((chat) => (
                <li
                  key={chat.id}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${selectedChat?.id === chat.id ? 'bg-gray-100' : ''}`}
                  onClick={() => setSelectedChat(chat)}
                >
                  {chat.title ?? '(no title)'}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="p-4 text-gray-500">Select a user to view chats</p>
        )}
      </div>

      {/* Messages panel */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 border-b flex justify-between items-center">
              <span className="font-medium">Messages</span>
              <button
                className="text-xs text-blue-600 underline"
                onClick={copyChat}
              >
                Copy chat
              </button>
            </div>
            <div className="p-4 space-y-2">
              {messages.map((m, idx) => (
                <div key={idx} className="text-sm whitespace-pre-wrap">
                  <span className="font-semibold mr-1">{m.role}:</span>
                  <span>{m.content}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="p-4 text-gray-500">Select a chat to view messages</p>
        )}
      </div>

      {/* Role actions sidebar */}
      {selectedUser && (
        <div className="w-48 border-l p-4 space-y-4">
          <h3 className="font-medium">Role actions</h3>
          {selectedUser.role === 'user' ? (
            <button
              className="w-full bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded"
              onClick={() => changeRole(selectedUser, 'admin')}
            >
              Promote to admin
            </button>
          ) : (
            <button
              className="w-full bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2 rounded"
              onClick={() => changeRole(selectedUser, 'user')}
            >
              Demote to user
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;