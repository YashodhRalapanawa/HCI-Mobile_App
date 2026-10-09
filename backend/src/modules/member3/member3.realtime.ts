import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { Chat, Message, type ChatDocument } from './member3.models.js';

interface SocketUser {
  id: string;
}

export function attachMember3Realtime(server: HttpServer): Server {
  const io = new Server(server, { cors: { origin: true, credentials: true } });

  io.use((socket, next) => {
    const token = String(socket.handshake.auth?.token ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return next(new Error('Authentication required.'));
    try {
      socket.data.user = jwt.verify(token, env.JWT_SECRET) as SocketUser;
      return next();
    } catch {
      return next(new Error('Invalid or expired session token.'));
    }
  });

  io.on('connection', (socket) => {
    const userId = new mongoose.Types.ObjectId(socket.data.user.id);
    socket.join(`user:${userId.toString()}`);

    socket.on('chat:join', async (chatId: string, callback?: (result: { ok: boolean; message?: string }) => void) => {
      if (!mongoose.isValidObjectId(chatId)) {
        callback?.({ ok: false, message: 'Invalid chat.' });
        return;
      }
      const chat = await Chat.findOne({ _id: chatId, memberIds: userId }).lean<ChatDocument>();
      if (!chat) {
        callback?.({ ok: false, message: 'Chat access denied.' });
        return;
      }
      socket.join(`chat:${chatId}`);
      callback?.({ ok: true });
    });

    socket.on('chat:typing', (chatId: string, isTyping: boolean) => {
      socket.to(`chat:${chatId}`).emit('chat:typing', { chatId, userId: userId.toString(), isTyping: Boolean(isTyping) });
    });

    socket.on('chat:read', async (payload: { chatId: string; messageId: string }) => {
      if (!mongoose.isValidObjectId(payload?.chatId) || !mongoose.isValidObjectId(payload?.messageId)) return;
      const chat = await Chat.findOne({ _id: payload.chatId, memberIds: userId }).lean();
      if (!chat) return;
      const message = await Message.findOneAndUpdate(
        { _id: payload.messageId, chatId: chat._id, senderId: { $ne: userId } },
        { readAt: new Date(), deliveredAt: new Date() },
        { new: true },
      ).lean();
      if (message) io.to(`chat:${payload.chatId}`).emit('chat:read', { chatId: payload.chatId, messageId: message._id.toString(), readAt: message.readAt });
    });

    socket.on('disconnect', () => {
      socket.broadcast.emit('presence:offline', { userId: userId.toString(), lastSeen: new Date().toISOString() });
    });
    socket.broadcast.emit('presence:online', { userId: userId.toString() });
  });

  return io;
}
