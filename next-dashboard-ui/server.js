require('dotenv').config({ path: '.env.local' });

const { createServer } = require('http');
const net = require('net');
const dns = require('dns');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const dev = process.env.NODE_ENV !== 'production';
const bindHost = process.env.HOST || '0.0.0.0';
const internalHost = process.env.INTERNAL_HOST || '127.0.0.1';
const platformPort = process.env.PORT || process.env.WEBSITES_PORT;
const requestedPort = Number(platformPort) || 3000;
const shouldProbeForAvailablePort = dev || !platformPort;
const remindersIntervalMs = Number(process.env.EVENT_REMINDER_INTERVAL_MS || 60 * 60 * 1000);

const dnsServers = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (dnsServers.length > 0) {
  try {
    dns.setServers(dnsServers);
  } catch (error) {
    console.warn('Failed to set custom DNS servers for MongoDB:', error);
  }
}

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const tryPort = (portToTry) => {
      const tester = net.createServer();

      tester.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          tryPort(portToTry + 1);
          return;
        }
        reject(err);
      });

      tester.once('listening', () => {
        tester.close(() => resolve(portToTry));
      });

      tester.listen(portToTry);
    };

    tryPort(startPort);
  });
}

function startEventReminderScheduler(port) {
  const runReminders = async () => {
    try {
      const response = await fetch(`http://${internalHost}:${port}/api/events/reminders/run`, {
        method: 'POST',
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Event reminder job failed:', text);
        return;
      }

      const result = await response.json();
      console.log(
        `[EventReminder] created=${result.remindersCreated || 0}, dayBefore=${result.dayBeforeEventsProcessed || 0}, dayOf=${result.dayOfEventsProcessed || 0}`
      );
    } catch (error) {
      console.error('Event reminder scheduler error:', error);
    }
  };

  // Trigger once on startup, then keep running periodically.
  runReminders();
  setInterval(runReminders, remindersIntervalMs);
}

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

const startServer = async () => {
  const activePort = shouldProbeForAvailablePort ? await findAvailablePort(requestedPort) : requestedPort;

  if (activePort !== requestedPort) {
    console.warn(`Port ${requestedPort} is in use, starting on ${activePort} instead.`);
  }

  // Initialize Next.js
  const app = next({ dev, hostname: bindHost, port: activePort });
  const handle = app.getRequestHandler();

  return app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });

    // Initialize Socket.IO
    const io = new Server(httpServer);

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

    const listenWithFallback = (portToTry) => {
      httpServer.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          const nextPort = portToTry + 1;
          console.warn(`Port ${portToTry} is in use, retrying on ${nextPort}.`);
          listenWithFallback(nextPort);
          return;
        }

        console.error('Server startup error:', err);
        process.exit(1);
      });

      httpServer.listen(portToTry, () => {
        activePort = portToTry;
        console.log(`> Ready on http://${bindHost}:${activePort}`);
        startEventReminderScheduler(activePort);
      });
    };

    listenWithFallback(activePort);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
