const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let storedText = "Enter your text here.....";
let currentEditorId = null;

// Handle Socket.IO connections
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('onConnect', (data) => {
        const { sessionId } = data;
        console.log(`Client ${sessionId} connected.`);

        socket.emit('textUpdate', { text: storedText });
    });

    // Handle access request when client clicks inside text area
    socket.on('clickInsideTextArea', (data) => {
        const { sessionId } = data;
        console.log(`Client ${sessionId} is requesting access to edit.`);

        if (currentEditorId === null || currentEditorId === sessionId) {
            currentEditorId = sessionId;
            socket.emit('accessResponse', { sessionId, accepted: true });
        } else {
            socket.emit('accessResponse', { sessionId, accepted: false });
        }
    });

    // Text updates from the client with edit access
    socket.on('updateText', (data) => {
        const { sessionId, text } = data;

        if (sessionId === currentEditorId) {
            storedText = text;
            console.log(`Text updated by ${sessionId}: ${text}`);
            io.emit('textUpdate', { text: storedText });
        } else {
            console.log(`Client ${sessionId} attempted to update text without permission.`);
        }
    });

    // Clicks outside text area resulting in revoking edit access
    socket.on('clickOutOfInputArea', (data) => {
        const { sessionId } = data;
        if (sessionId === currentEditorId) {
            console.log(`Client ${sessionId} released edit access.`);
            currentEditorId = null;
            socket.emit('accessRevoked', { sessionId });
        }
    });

    // Client disconnecting to release edit option
    socket.on('closeApp', (data) => {
        const { sessionId } = data;
        if (sessionId === currentEditorId) {
            console.log(`Client ${sessionId} closed the app and released edit access.`);
            currentEditorId = null;
            socket.emit('accessRevoked', { sessionId });
        }
    });

    // Client disconnection
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        if (socket.id === currentEditorId) {
            console.log(`Editor ${socket.id} disconnected, releasing edit access.`);
            currentEditorId = null;
            io.emit('accessRevoked', { sessionId: socket.id });
        }
    });
});

// Run the server
server.listen(3000, () => {
    console.log('Server is listening on port 3000');
});