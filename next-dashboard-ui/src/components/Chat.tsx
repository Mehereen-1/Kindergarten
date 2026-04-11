'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, User, UserPlus, Search, Paperclip, X } from 'lucide-react';
import TeacherDirectory from '@/app/components/TeacherDirectory';
import ParentDirectory from '@/app/components/ParentDirectory';

interface Attachment {
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

type DeliveryStatus = 'sent' | 'delivered' | 'seen';

interface Message {
  _id: string;
  senderId: string;
  message: string;
  attachments?: Attachment[];
  timestamp: Date;
  read: boolean;
  deliveryStatus?: DeliveryStatus;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isContactTyping, setIsContactTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTeacherDirectory, setShowTeacherDirectory] = useState(false);
  const [showParentDirectory, setShowParentDirectory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    const socketConnection = io(socketUrl);
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
          attachments: data.attachments || [],
          timestamp: data.timestamp,
          read: false,
          deliveryStatus: 'delivered',
        }]);

        socketConnection.emit('messages-read', {
          readerId: currentUser.id,
          readerRole: currentUser.role,
          otherUserId: selectedContact.id,
          otherUserRole: selectedContact.role,
        });
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
        attachments: data.attachments || [],
        timestamp: data.timestamp,
        read: false,
        deliveryStatus: (data.deliveryStatus || 'sent') as DeliveryStatus,
      }]);
      // Refresh contacts list so sender sees their own message in last message preview
      fetchContacts();
    });

    socketConnection.on('messages-seen', (data) => {
      if (!selectedContact || data.readerId !== selectedContact.id) {
        return;
      }

      setMessages(prev => prev.map((message) => {
        if (message.senderId !== currentUser.id) {
          return message;
        }

        if (Array.isArray(data.messageIds) && data.messageIds.length > 0) {
          const isSeen = data.messageIds.includes(message._id);
          return isSeen ? { ...message, read: true, deliveryStatus: 'seen' } : message;
        }

        return { ...message, read: true, deliveryStatus: 'seen' };
      }));
    });

    socketConnection.on('typing-start', (data) => {
      if (selectedContact && data.senderId === selectedContact.id) {
        setIsContactTyping(true);
      }
    });

    socketConnection.on('typing-stop', (data) => {
      if (selectedContact && data.senderId === selectedContact.id) {
        setIsContactTyping(false);
      }
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
    setSearchQuery('');
    setAttachedFiles([]);
    setIsContactTyping(false);
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

    socket?.emit('messages-read', {
      readerId: currentUser.id,
      readerRole: currentUser.role,
      otherUserId: contact.id,
      otherUserRole: contact.role,
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

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  };

  const handleAttachFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) {
      return;
    }
    setAttachedFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const getMessageStatusLabel = (message: Message) => {
    const status = message.deliveryStatus || (message.read ? 'seen' : 'sent');
    if (status === 'seen') return 'Seen';
    if (status === 'delivered') return 'Delivered';
    return 'Sent';
  };

  const emitTypingStart = () => {
    if (!socket || !selectedContact) return;

    socket.emit('typing-start', {
      senderId: currentUser.id,
      receiverId: selectedContact.id,
      receiverRole: selectedContact.role,
    });
  };

  const emitTypingStop = () => {
    if (!socket || !selectedContact) return;

    socket.emit('typing-stop', {
      senderId: currentUser.id,
      receiverId: selectedContact.id,
      receiverRole: selectedContact.role,
    });
  };

  const handleMessageInputChange = (value: string) => {
    setNewMessage(value);

    if (!selectedContact || !socket) {
      return;
    }

    if (value.trim()) {
      emitTypingStart();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        emitTypingStop();
      }, 1200);
    } else {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      emitTypingStop();
    }
  };

  const uploadAttachments = async () => {
    if (!attachedFiles.length) {
      return [] as Attachment[];
    }

    const formData = new FormData();
    attachedFiles.forEach((file) => formData.append('files', file));

    const response = await fetch('/api/chat/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(errorData.error || 'Upload failed');
    }

    const data = await response.json();
    return data.files || [];
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) {
      return text;
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'ig');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={`${part}-${index}`} className="bg-yellow-200 text-gray-900 px-0.5 rounded-sm">
          {part}
        </mark>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      )
    );
  };

  const handleSendMessage = async () => {
    const outgoingMessage = newMessage.trim();

    if ((!outgoingMessage && !attachedFiles.length) || !selectedContact || !socket || isSending) {
      console.log('Cannot send message:', { 
        hasMessage: !!outgoingMessage || attachedFiles.length > 0,
        hasContact: !!selectedContact, 
        hasSocket: !!socket,
        isSending,
      });
      return;
    }

    setIsSending(true);
    try {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      emitTypingStop();

      const uploadedAttachments = await uploadAttachments();

      console.log('Sending message:', {
        senderId: currentUser.id,
        receiverId: selectedContact.id,
        message: outgoingMessage,
        attachmentCount: uploadedAttachments.length,
      });

      socket.emit('private-message', {
        senderId: currentUser.id,
        receiverId: selectedContact.id,
        message: outgoingMessage,
        attachments: uploadedAttachments,
        senderRole: currentUser.role,
        receiverRole: selectedContact.role
      });

      setNewMessage('');
      setAttachedFiles([]);
    } catch (error: any) {
      console.error('Send message failed:', error);
      alert(error.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
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

  const filteredMessages = messages.filter((message) => {
    if (!searchQuery.trim()) {
      return true;
    }
    const query = searchQuery.toLowerCase();
    const messageMatch = (message.message || '').toLowerCase().includes(query);
    const attachmentMatch = (message.attachments || []).some((file) =>
      file.name.toLowerCase().includes(query)
    );
    return messageMatch || attachmentMatch;
  });

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
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedContact.name}</p>
                    <p className="text-sm text-gray-500 capitalize">
                      {isContactTyping ? 'Typing...' : selectedContact.role}
                    </p>
                  </div>
                </div>

                <div className="w-full md:w-72 lg:w-80">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search messages..."
                      className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {searchQuery && (
                <p className="text-xs text-gray-500">
                  {filteredMessages.length} result{filteredMessages.length === 1 ? '' : 's'} found
                </p>
              )}
              {filteredMessages.map((message) => (
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
                    {message.message && <p>{highlightMatch(message.message, searchQuery)}</p>}
                    {!!message.attachments?.length && (
                      <div className={`${message.message ? 'mt-2' : ''} space-y-2`}>
                        {message.attachments.map((file, index) => {
                          const isImage = file.mimeType?.startsWith('image/');
                          return (
                            <div key={`${file.url}-${index}`} className="rounded-md border border-black/10 bg-white/70 p-2">
                              {isImage && (
                                <img
                                  src={file.url}
                                  alt={file.name}
                                  className="max-h-40 w-full object-cover rounded mb-2"
                                />
                              )}
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-medium underline break-all"
                              >
                                {highlightMatch(file.name, searchQuery)}
                              </a>
                              <p className="text-xs opacity-80 mt-1">{formatFileSize(file.size)}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <p className={`text-xs mt-1 ${
                      message.senderId === currentUser.id ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                      {message.senderId === currentUser.id && ` • ${getMessageStatusLabel(message)}`}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleAttachFiles}
              />

              {attachedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-xs"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span className="max-w-48 truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-blue-600 hover:text-blue-800"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSending}
                  className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100"
                  title="Add attachment"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => handleMessageInputChange(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message..."
                  disabled={isSending}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isSending}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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