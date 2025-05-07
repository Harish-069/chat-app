document.addEventListener('DOMContentLoaded', () => {
    if (typeof io === 'undefined') {
        alert('Failed to connect to the server. Please ensure the server is running on http://localhost:8000.');
        return;
    }

    const socket = io('http://localhost:8000');
    const form = document.getElementById('sendcontainer');
    const messageInput = document.getElementById('messageInp');
    const fileInput = document.getElementById('file-input');
    const messageContainer = document.querySelector('.container');
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPicker = document.getElementById('emoji-picker');
    const emojiSuggestions = document.getElementById('emoji-suggestions');
    const modal = document.getElementById('username-modal');
    const usernameInput = document.getElementById('username-input');
    const profilePicInput = document.getElementById('profile-pic-input');
    const joinBtn = document.getElementById('join-btn');
    const errorMessage = document.getElementById('error-message');
    const audio = new Audio('ting.mp3');

    let userProfilePic = null;

    // Emoji mapping for auto-suggestions
    const emojiMap = {
        ':smile': '😊',
        ':laugh': '😂',
        ':love': '😍',
        ':thumb': '👍',
        ':party': '🎉',
        ':fire': '🔥',
        ':sad': '😢',
        ':cool': '😎',
        ':heart': '💖',
        ':star': '🌟',
        ':sparkles': '✨',
        ':chat': '💬',
        ':cake': '🎂',
        ':gift': '🎁'
    };

    const append = (data, position, name, timestamp, profilePic) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', position);

        const contentElement = document.createElement('div');
        contentElement.classList.add('message-content');

        if (data.message) {
            contentElement.innerText = position === 'left' ? `${name}: ${data.message}` : `You: ${data.message}`;
        } else if (data.file) {
            if (data.fileType.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = data.file;
                img.classList.add('chat-image');
                contentElement.appendChild(img);
            } else {
                const fileLink = document.createElement('a');
                fileLink.href = data.file;
                fileLink.download = data.fileName || 'file';
                fileLink.classList.add('file-link');
                fileLink.innerHTML = `📄 ${data.fileName || 'Download File'}`;
                contentElement.appendChild(fileLink);
            }
        }

        const timeElement = document.createElement('span');
        timeElement.classList.add('timestamp');
        timeElement.innerText = timestamp;

        contentElement.appendChild(timeElement);

        if (profilePic) {
            const profileImg = document.createElement('img');
            profileImg.src = profilePic;
            profileImg.classList.add('profile-pic');
            messageElement.appendChild(profileImg);
        }

        messageElement.appendChild(contentElement);
        messageContainer.appendChild(messageElement);
        messageContainer.scrollTop = messageContainer.scrollHeight;

        if (position === 'left') {
            audio.play().catch(() => {});
        }
    };

    modal.style.display = 'flex';

    joinBtn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        if (!username) {
            errorMessage.style.display = 'block';
            return;
        }

        if (profilePicInput.files[0]) {
            const reader = new FileReader();
            reader.onload = () => {
                userProfilePic = reader.result;
                joinChat(username);
            };
            reader.readAsDataURL(profilePicInput.files[0]);
        } else {
            joinChat(username);
        }
    });

    const joinChat = (username) => {
        modal.style.display = 'none';
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        append({ message: `You joined the chat as ${username}` }, 'right', username, timestamp, userProfilePic);
        socket.emit('new-user-joined', { name: username, profilePic: userProfilePic });
    };

    socket.on('user-joined', data => {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        append({ message: `${data.name} joined the chat` }, 'left', data.name, timestamp, data.profilePic);
    });

    socket.on('receive', data => {
        const timestamp = data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        append(data, 'left', data.name, timestamp, data.profilePic);
    });

    socket.on('user-left', data => {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        append({ message: `${data.name} left the chat` }, 'left', data.name, timestamp, data.profilePic);
    });

    socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        alert('Connection to server failed: ' + error.message);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (!message) return;
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        append({ message }, 'right', null, timestamp, userProfilePic);
        socket.emit('send', { message, profilePic: userProfilePic, timestamp });
        messageInput.value = '';
        emojiSuggestions.style.display = 'none';
    });

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const fileData = {
                file: reader.result,
                fileType: file.type,
                fileName: file.name,
                profilePic: userProfilePic,
                timestamp
            };
            append(fileData, 'right', null, timestamp, userProfilePic);
            socket.emit('send-file', { ...fileData, name: usernameInput.value.trim() });
        };
        reader.readAsDataURL(file);
        fileInput.value = '';
    });

    emojiBtn.addEventListener('click', () => {
        emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'flex' : 'none';
        emojiSuggestions.style.display = 'none';
    });

    emojiPicker.addEventListener('click', (e) => {
        if (e.target.classList.contains('emoji')) {
            messageInput.value += e.target.dataset.emoji;
            messageInput.focus();
            emojiPicker.style.display = 'none';
        }
    });

    messageInput.addEventListener('input', () => {
        const value = messageInput.value;
        const match = value.match(/:(\w+)$/);
        if (match) {
            const keyword = `:${match[1].toLowerCase()}`;
            const suggestions = Object.keys(emojiMap).filter(key => key.startsWith(keyword));
            if (suggestions.length) {
                emojiSuggestions.innerHTML = suggestions.map(key => `<span class="emoji-suggestion" data-emoji="${emojiMap[key]}">${emojiMap[key]}</span>`).join('');
                emojiSuggestions.style.display = 'flex';
            } else {
                emojiSuggestions.style.display = 'none';
            }
        } else {
            emojiSuggestions.style.display = 'none';
        }
    });

    emojiSuggestions.addEventListener('click', (e) => {
        if (e.target.classList.contains('emoji-suggestion')) {
            const emoji = e.target.dataset.emoji;
            messageInput.value = messageInput.value.replace(/:\w+$/, emoji);
            messageInput.focus();
            emojiSuggestions.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (!emojiPicker.contains(e.target) && !emojiBtn.contains(e.target)) {
            emojiPicker.style.display = 'none';
        }
        if (!emojiSuggestions.contains(e.target) && !messageInput.contains(e.target)) {
            emojiSuggestions.style.display = 'none';
        }
    });
});