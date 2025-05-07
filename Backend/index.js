const express = require('express');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app); // Required for socket.io
const PORT = process.env.PORT || 8000;

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve index.html for any unknown routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Socket.io setup
const io = require('socket.io')(server, {
  cors: {
    origin: "*", // You can restrict to specific URL like http://localhost:5500
    methods: ["GET", "POST"]
  }
});

const users = {};

io.on('connection', socket => {
  socket.on('new-user-joined', data => {
    users[socket.id] = data;
    socket.broadcast.emit('user-joined', data);
  });

  socket.on('send', data => {
    socket.broadcast.emit('receive', {
      message: data.message,
      name: users[socket.id].name,
      profilePic: data.profilePic || users[socket.id].profilePic,
      timestamp: data.timestamp
    });
  });

  socket.on('send-file', data => {
    socket.broadcast.emit('receive', {
      file: data.file,
      fileType: data.fileType,
      fileName: data.fileName,
      name: users[socket.id].name,
      profilePic: data.profilePic || users[socket.id].profilePic,
      timestamp: data.timestamp
    });
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      socket.broadcast.emit('user-left', user);
      delete users[socket.id];
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
