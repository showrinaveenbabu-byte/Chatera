const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config({ path: __dirname + '/.env' });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/friends', require('./routes/friendRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));

// Database connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/communication_app';
mongoose.connect(MONGO_URI)
  .then((conn) => console.log(`MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.error('Make sure MongoDB service is running locally or check your MONGO_URI in .env');
  });

const users = {}; // Room tracking
const socketToRoom = {}; // Socket to Room mapping
const userSockets = {}; // Map user IDs to socket IDs

// Models for DB storage
const Message = require('./models/Message');

// Socket.io connection for signaling
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  // Register user socket & join personal room for multi-device/multi-tab delivery
  socket.on('register-user', (userId) => {
    if (!userId) return;
    const uid = (typeof userId === 'object' && userId._id ? userId._id : userId).toString().trim();
    socket.userId = uid;
    
    // Join private user room (handles multiple tabs, reloads, and reconnects effortlessly)
    socket.join(`user_${uid}`);

    // Also track in userSockets map (using a Set for multiple active sockets)
    if (!userSockets[uid]) {
      userSockets[uid] = new Set();
    }
    userSockets[uid].add(socket.id);
    console.log(`[Socket] User ${uid} registered with socket ${socket.id} (Room: user_${uid})`);
  });

  socket.on('join-room', (roomId, userId) => {
    if (users[roomId]) {
      const length = users[roomId].length;
      if (length === 10) { // Limit to 10 users per room
        socket.emit('room-full');
        return;
      }
      users[roomId].push(socket.id);
    } else {
      users[roomId] = [socket.id];
    }
    socketToRoom[socket.id] = roomId;
    
    socket.join(roomId);
    const usersInThisRoom = users[roomId].filter(id => id !== socket.id);

    socket.emit('all-users', usersInThisRoom);
  });

  socket.on('sending-signal', payload => {
    io.to(payload.userToSignal).emit('user-joined', { signal: payload.signal, callerID: payload.callerID });
  });

  socket.on('returning-signal', payload => {
    io.to(payload.callerID).emit('receiving-returned-signal', { signal: payload.signal, id: socket.id });
  });

  // Direct Messaging: Instant Socket Delivery + Asynchronous DB Persistence
  socket.on('send-direct-message', async (messageData) => {
    try {
      if (!messageData) return;
      const senderRaw = messageData.sender;
      const receiverRaw = messageData.receiver;

      const senderId = (typeof senderRaw === 'object' && senderRaw?._id ? senderRaw._id : senderRaw)?.toString().trim();
      const receiverId = (typeof receiverRaw === 'object' && receiverRaw?._id ? receiverRaw._id : receiverRaw)?.toString().trim();
      const text = messageData.text || '';
      const type = messageData.type || 'text';
      const image = messageData.image || null;
      const sticker = messageData.sticker || null;

      if (!senderId || !receiverId) {
        console.warn('[Socket] Message missing valid sender or receiver:', { senderId, receiverId });
        return;
      }

      // Generate unique message ID and timestamp
      const msgId = new mongoose.Types.ObjectId();
      const timestamp = new Date();

      const msgPayload = {
        _id: msgId.toString(),
        sender: senderId,
        receiver: receiverId,
        text,
        type,
        image,
        sticker,
        createdAt: timestamp.toISOString()
      };

      console.log(`[Socket] Routing direct message: ${senderId} -> ${receiverId} (Room: user_${receiverId})`);

      // 1. Instantly broadcast to receiver's personal room (all active sockets/tabs)
      io.to(`user_${receiverId}`).emit('receive-direct-message', msgPayload);

      // 2. Deliver confirmation back to sender's personal room (all active sockets/tabs)
      io.to(`user_${senderId}`).emit('message-sent', msgPayload);
      socket.emit('message-sent', msgPayload);

      // 3. Persist to MongoDB asynchronously without blocking real-time socket delivery
      try {
        const sObjId = mongoose.Types.ObjectId.isValid(senderId) ? new mongoose.Types.ObjectId(senderId) : null;
        const rObjId = mongoose.Types.ObjectId.isValid(receiverId) ? new mongoose.Types.ObjectId(receiverId) : null;

        if (sObjId && rObjId) {
          const newMsg = new Message({
            _id: msgId,
            sender: sObjId,
            receiver: rObjId,
            text,
            type,
            image,
            sticker,
            createdAt: timestamp
          });
          newMsg.save().catch(err => console.error('[DB] Error saving message:', err.message));
        }
      } catch (dbErr) {
        console.error('[DB] Asynchronous persistence error:', dbErr.message);
      }
    } catch (err) {
      console.error('[Socket] Error in send-direct-message:', err);
    }
  });

  // Chat/Messaging in Room (WebRTC Room)
  socket.on('send-message', (roomId, messageData) => {
    socket.to(roomId).emit('receive-message', messageData);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.userId && userSockets[socket.userId]) {
      userSockets[socket.userId].delete(socket.id);
      if (userSockets[socket.userId].size === 0) {
        delete userSockets[socket.userId];
      }
    }
    const roomId = socketToRoom[socket.id];
    let room = users[roomId];
    if (room) {
      room = room.filter(id => id !== socket.id);
      users[roomId] = room;
      if (room.length === 0) {
        delete users[roomId];
      }
    }
    socket.to(roomId).emit('user-disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
