'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, User, UserPlus } from 'lucide-react';
import TeacherDirectory from '@/app/components/TeacherDirectory';
import ParentDirectory from '@/app/components/ParentDirectory';

interface Message {
  _id: string;
  senderId: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  role: string;
  lastMessage?: {
    message: string;
    timestamp: Date;
    isFromMe: boolean;
  };
  unreadCount: number;
}

interface ChatProps {
  currentUser: {
    id: string;
    role: string;
  };
}

export default function Chat({ currentUser }: ChatProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTeacherDirectory, setShowTeacherDirectory] = useState(false);
  const [showParentDirectory, setShowParentDirectory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize socket connection
  useEffect(() => {
    const socketConnection = io('http://localhost:3000');
    setSocket(socketConnection);

    socketConnection.on('connect', () => {
      console.log('Connected to server');
      socketConnection.emit('join', {
        userId: currentUser.id,
        role: currentUser.role
      });
    });

    socketConnection.on('private-message', (data) => {
      if (selectedContact && data.senderId === selectedContact.id) {
        setMessages(prev => [...prev, {
          _id: data.messageId,
          senderId: data.senderId,
          message: data.message,
          timestamp: data.timestamp,
          read: false
        }]);
      }
      // Update contacts list
      fetchContacts();
    });

    socketConnection.on('message-sent', (data) => {
      console.log('Message sent confirmation:', data);
      setMessages(prev => [...prev, {
        _id: data.messageId,
        senderId: currentUser.id,
        message: data.message,
        timestamp: data.timestamp,
        read: false
      }]);
      // Refresh contacts list so sender sees their own message in last message preview
      fetchContacts();
    });

    socketConnection.on('message-error', (data) => {
      console.error('Message error:', data);
      alert('Failed to send message: ' + data.error);
    });

    return () => {
      socketConnection.disconnect();
    };
  }, [currentUser, selectedContact]);

  // Fetch contacts
  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/chat/contacts');
      const data = await response.json();
      setContacts(data.contacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  // Fetch messages for selected contact
  const fetchMessages = async (contactId: string) => {
    try {
      const response = await fetch(`/api/chat/history?senderId=${currentUser.id}&receiverId=${contactId}`);
      if (!response.ok) {
        console.error('Failed to fetch messages:', response.status);
        return;
      }
      const data = await response.json();
      console.log('Loaded messages:', data.messages.length);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchContacts();
    setLoading(false);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleContactSelect = async (contact: Contact) => {
    setSelectedContact(contact);
    setShowTeacherDirectory(false);
    setShowParentDirectory(false);
    await fetchMessages(contact.id);

    // Mark messages as read
    await fetch('/api/chat/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: contact.id,
        receiverId: currentUser.id
      })
    });

    // Update unread count
    setContacts(prev => prev.map(c =>
      c.id === contact.id ? { ...c, unreadCount: 0 } : c
    ));
  };

  const handleNewChat = (teacherId: string, teacherName: string) => {
    // Check if contact already exists
    const existingContact = contacts.find(c => c.id === teacherId);
    
    if (existingContact) {
      handleContactSelect(existingContact);
    } else {
      // Create a new contact object for the teacher
      const newContact: Contact = {
        id: teacherId,
        name: teacherName,
        email: '',
        role: 'teacher',
        unreadCount: 0
      };
      
      setContacts(prev => [newContact, ...prev]);
      setSelectedContact(newContact);
      setMessages([]);
      setShowTeacherDirectory(false);
    }
  };

  const handleNewParentChat = (parentId: string, parentName: string) => {
    // Check if contact already exists
    const existingContact = contacts.find(c => c.id === parentId);
    
    if (existingContact) {
      handleContactSelect(existingContact);
    } else {
      // Create a new contact object for the parent
      const newContact: Contact = {
        id: parentId,
        name: parentName,
        email: '',
        role: 'parent',
        unreadCount: 0
      };
      
      setContacts(prev => [newContact, ...prev]);
      setSelectedContact(newContact);
      setMessages([]);
      setShowParentDirectory(false);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedContact || !socket) {
      console.log('Cannot send message:', { 
        hasMessage: !!newMessage.trim(), 
        hasContact: !!selectedContact, 
        hasSocket: !!socket 
      });
      return;
    }

    console.log('Sending message:', { 
      senderId: currentUser.id, 
      receiverId: selectedContact.id, 
      message: newMessage.trim() 
    });

    socket.emit('private-message', {
      senderId: currentUser.id,
      receiverId: selectedContact.id,
      message: newMessage.trim(),
      senderRole: currentUser.role,
      receiverRole: selectedContact.role
    });

    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Contacts Sidebar */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Messages</h2>
            <button
              onClick={() => {
                if (currentUser.role === 'parent') {
                  setShowTeacherDirectory(!showTeacherDirectory);
                  setShowParentDirectory(false);
                } else {
                  setShowParentDirectory(!showParentDirectory);
                  setShowTeacherDirectory(false);
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
              title={currentUser.role === 'parent' ? 'Find new teacher to chat' : 'Find new parent to chat'}
            >
              <UserPlus size={16} />
              New Chat
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {contacts.length === 0 && !showTeacherDirectory && !showParentDirectory && (
            <div className="p-4 text-center text-gray-500">
              <p className="mb-2">No conversations yet</p>
              <button
                onClick={() => {
                  if (currentUser.role === 'parent') {
                    setShowTeacherDirectory(true);
                  } else {
                    setShowParentDirectory(true);
                  }
                }}
                className="text-blue-500 hover:underline text-sm"
              >
                {currentUser.role === 'parent' ? 'Find a teacher' : 'Find a parent'} to start chatting
              </button>
            </div>
          )}
          {contacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => handleContactSelect(contact)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedContact?.id === contact.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-gray-500 capitalize">{contact.role}</p>
                  </div>
                </div>
                {contact.unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {contact.unreadCount}
                  </span>
                )}
              </div>
              {contact.lastMessage && (
                <p className="text-sm text-gray-600 mt-1 truncate">
                  {contact.lastMessage.isFromMe ? 'You: ' : ''}{contact.lastMessage.message}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area or Directory */}
      <div className="flex-1 flex flex-col">
        {showTeacherDirectory ? (
          <div className="p-6 overflow-y-auto">
            <TeacherDirectory onSelectTeacher={handleNewChat} />
          </div>
        ) : showParentDirectory ? (
          <div className="p-6 overflow-y-auto">
            <ParentDirectory onSelectParent={handleNewParentChat} />
          </div>
        ) : selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">{selectedContact.name}</p>
                  <p className="text-sm text-gray-500 capitalize">{selectedContact.role}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex ${message.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.senderId === currentUser.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p>{message.message}</p>
                    <p className={`text-xs mt-1 ${
                      message.senderId === currentUser.id ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Select a contact to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}