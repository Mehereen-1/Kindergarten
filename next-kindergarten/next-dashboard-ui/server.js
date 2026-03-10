require('dotenv').config({ path: '.env.local' });

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}
mongoose.connect(MONGODB_URI).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join room based on user role and ID
    socket.on('join', (data) => {
      const { userId, role } = data;
      socket.join(`${role}-${userId}`);
      console.log(`User ${userId} (${role}) joined room ${role}-${userId}`);
    });

    // Handle private messages
    socket.on('private-message', async (data) => {
      const { senderId, receiverId, message, senderRole, receiverRole } = data;

      console.log('Received message event:', { senderId, receiverId, senderRole, receiverRole, messageLength: message?.length });

      try {
        // Save message to database
        const ChatMessage = require('./src/lib/models/ChatMessage');
        const newMessage = new ChatMessage({
          senderId,
          receiverId,
          senderRole,
          receiverRole,
          message,
        });
        await newMessage.save();
        console.log('Message saved:', newMessage._id);

        // Emit to receiver in their room
        const receiverRoom = `${receiverRole}-${receiverId}`;
        console.log(`Emitting to receiver room: ${receiverRoom}`);
        socket.to(receiverRoom).emit('private-message', {
          senderId,
          message,
          timestamp: newMessage.timestamp,
          messageId: newMessage._id,
        });

        // Emit back to sender for confirmation
        socket.emit('message-sent', {
          receiverId,
          message,
          timestamp: newMessage.timestamp,
          messageId: newMessage._id,
        });
      } catch (error) {
        console.error('Error saving message:', error.message);
        socket.emit('message-error', { error: error.message });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});