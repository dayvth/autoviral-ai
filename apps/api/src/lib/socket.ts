import type { Server as SocketIO } from 'socket.io';

let _io: SocketIO;

export function setIo(io: SocketIO) {
  _io = io;
}

export function getIo(): SocketIO {
  if (!_io) throw new Error('Socket.IO not initialized');
  return _io;
}
