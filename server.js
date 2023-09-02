const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const ACTIONS = require("./action");

const server = http.createServer(app);

const io = new Server(server);

const userScoketMap = {};

function getAllClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        userName: userScoketMap[socketId],
      };
    }
  );
}

io.on("connection", (socket) => {
  socket.on(ACTIONS.JOIN, ({ roomId, userName }) => {
    socket.join(roomId);
    userScoketMap[socket.id] = userName;
    const allClients = getAllClients(roomId);

    allClients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        allClients,
        userName,
        socketId: socket.id,
      });
    });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ code, socketId }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        userName: userScoketMap[socket.id],
      });
    });
    delete userScoketMap[socket.id];
    socket.leave();
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
