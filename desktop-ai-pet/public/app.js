// mm桌面悬浮宠物 - 主应用逻辑
class FloatingPet {
    constructor() {
        this.petElement = document.getElementById('floatingPet');
        this.isDragging = false;
        this.currentX = 0;
        this.currentY = 0;
        this.initialX = 0;
        this.initialY = 0;
        this.xOffset = 0;
        this.yOffset = 0;
        this.velocity = { x: 0, y: 0 };
        this.lastX = 0;
        this.lastY = 0;
        this.timestamp = 0;

        this.init();
    }

    init() {
        // 从本地存储恢复位置
        const savedPosition = localStorage.getItem('mmPetPosition');
        if (savedPosition) {
            const { x, y } = JSON.parse(savedPosition);
            this.setPosition(x, y);
        } else {
            // 默认位置
            this.setPosition(100, 100);
        }

        this.bindEvents();
    }

    bindEvents() {
        const handle = this.petElement.querySelector('.pet-drag-handle');
        
        // 鼠标事件
        handle.addEventListener('mousedown', (e) => this.dragStart(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.dragEnd());

        // 触摸事件
        handle.addEventListener('touchstart', (e) => this.dragStart(e.touches[0]));
        document.addEventListener('touchmove', (e) => this.drag(e.touches[0]));
        document.addEventListener('touchend', () => this.dragEnd());

        // 点击宠物打开聊天
        this.petElement.addEventListener('click', (e) => {
            if (!this.isDragging) {
                chatSystem.toggleChat();
            }
        });
    }

    dragStart(e) {
        this.initialX = e.clientX - this.xOffset;
        this.initialY = e.clientY - this.yOffset;
        this.isDragging = true;
        this.timestamp = Date.now();
        this.lastX = e.clientX;
        this.lastY = e.clientY;

        this.petElement.style.transition = 'none';
        this.petElement.style.cursor = 'grabbing';
    }

    drag(e) {
        if (this.isDragging) {
            e.preventDefault();
            
            const currentX = e.clientX - this.initialX;
            const currentY = e.clientY - this.initialY;

            this.xOffset = currentX;
            this.yOffset = currentY;

            this.setPosition(currentX, currentY);

            // 计算速度
            const now = Date.now();
            const deltaTime = now - this.timestamp;
            if (deltaTime > 0) {
                this.velocity.x = (e.clientX - this.lastX) / deltaTime;
                this.velocity.y = (e.clientY - this.lastY) / deltaTime;
            }

            this.lastX = e.clientX;
            this.lastY = e.clientY;
            this.timestamp = now;
        }
    }

    dragEnd() {
        this.isDragging = false;
        this.petElement.style.cursor = 'move';
        
        // 保存位置
        this.savePosition();

        // 惯性效果
        this.applyInertia();
        
        // 边界检测
        this.checkBoundaries();
    }

    setPosition(x, y) {
        this.currentX = x;
        this.currentY = y;
        
        this.petElement.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    savePosition() {
        localStorage.setItem('mmPetPosition', JSON.stringify({
            x: this.currentX,
            y: this.currentY
        }));
    }

    applyInertia() {
        const inertiaFactor = 0.9;
        const minVelocity = 0.1;

        const applyInertiaFrame = () => {
            if (Math.abs(this.velocity.x) > minVelocity || Math.abs(this.velocity.y) > minVelocity) {
                this.xOffset += this.velocity.x * 16;
                this.yOffset += this.velocity.y * 16;
                
                this.setPosition(this.xOffset, this.yOffset);
                
                this.velocity.x *= inertiaFactor;
                this.velocity.y *= inertiaFactor;
                
                this.checkBoundaries();
                requestAnimationFrame(applyInertiaFrame);
            } else {
                this.savePosition();
            }
        };

        requestAnimationFrame(applyInertiaFrame);
    }

    checkBoundaries() {
        const petRect = this.petElement.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let newX = this.xOffset;
        let newY = this.yOffset;

        // 边界检查
        if (petRect.left < 0) {
            newX = -this.currentX + 10;
            this.velocity.x = Math.abs(this.velocity.x) * 0.6;
        } else if (petRect.right > windowWidth) {
            newX = windowWidth - petRect.width - 10;
            this.velocity.x = -Math.abs(this.velocity.x) * 0.6;
        }

        if (petRect.top < 0) {
            newY = -this.currentY + 10;
            this.velocity.y = Math.abs(this.velocity.y) * 0.6;
        } else if (petRect.bottom > windowHeight) {
            newY = windowHeight - petRect.height - 10;
            this.velocity.y = -Math.abs(this.velocity.y) * 0.6;
        }

        if (newX !== this.xOffset || newY !== this.yOffset) {
            this.xOffset = newX;
            this.yOffset = newY;
            this.setPosition(newX, newY);
        }
    }
}

class ChatSystem {
    constructor() {
        this.chatWindow = document.getElementById('chatWindow');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.closeButton = document.getElementById('closeChat');
        
        this.isDragging = false;
        this.chatOffsetX = 0;
        this.chatOffsetY = 0;
        this.initialChatX = 0;
        this.initialChatY = 0;

        this.isOnline = true;
        this.retryCount = 0;
        this.maxRetries = 2;
        this.lastUserMessage = '';

        this.init();
    }

    init() {
        this.bindEvents();
        this.sendWelcomeMessage();
        
        // 从本地存储恢复聊天位置
        const savedChatPosition = localStorage.getItem('mmChatPosition');
        if (savedChatPosition) {
            const { x, y } = JSON.parse(savedChatPosition);
            this.setChatPosition(x, y);
        } else {
            this.setChatPosition(200, 200);
        }
    }

    bindEvents() {
        // 发送消息
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 关闭聊天
        this.closeButton.addEventListener('click', () => this.toggleChat());

        // 聊天窗口拖动
        this.chatWindow.querySelector('.chat-header').addEventListener('mousedown', (e) => {
            this.chatDragStart(e);
        });

        document.addEventListener('mousemove', (e) => this.chatDrag(e));
        document.addEventListener('mouseup', () => this.chatDragEnd());

        // PWA安装提示
        this.bindPWAEvents();
    }

    bindPWAEvents() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // 3秒后显示安装提示
            setTimeout(() => {
                const installPrompt = document.getElementById('installPrompt');
                if (installPrompt) {
                    installPrompt.classList.remove('hidden');
                }
            }, 3000);
        });

        const installButton = document.getElementById('installButton');
        const cancelInstall = document.getElementById('cancelInstall');
        
        if (installButton) {
            installButton.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                        document.getElementById('installPrompt').classList.add('hidden');
                    }
                    deferredPrompt = null;
                }
            });
        }
        
        if (cancelInstall) {
            cancelInstall.addEventListener('click', () => {
                document.getElementById('installPrompt').classList.add('hidden');
            });
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        this.lastUserMessage = message;
        this.addMessage(message, 'user');
        this.clearInput();

        // 显示打字指示器
        this.showTypingIndicator();

        // 使用前端模拟回复（立即生效）
        setTimeout(() => {
            this.hideTypingIndicator();
            const reply = this.getSimulatedReply(message);
            this.addMessage(reply, 'ai');
        }, 800 + Math.random() * 700);
    }

    // 智能模拟回复引擎
    getSimulatedReply(userMessage) {
        const lowerMessage = userMessage.toLowerCase().trim();
        
        // 问候类
        if (lowerMessage.match(/(你好|嗨|hello|hi|早上好|下午好|晚上好)/)) {
            const greetings = [
                "嘿！朋友mm上线啦～今天想聊点什么？(´｡• ᵕ •｡`)",
                "很高兴见到你！作为你的朋友，我已经准备好倾听啦 🌸",
                "mm在这里！准备好接受我特别的关心了吗？",
                "朋友，你来啦～今天过得怎么样？"
            ];
            return greetings[Math.floor(Math.random() * greetings.length)];
        }
        
        // 情绪低落类
        if (lowerMessage.match(/(不开心|难过|伤心|沮丧|郁闷|压力|累|疲惫)/)) {
            const comfort = [
                "我感受到你的情绪了呢...朋友之间就该分享这些，愿意和我多说一点吗？(´･ω･`)?",
                "来，告诉mm发生了什么？好朋友就是要互相支持呀",
                "你的感受很重要...让我以朋友的身份陪你一起面对",
                "虽然只是朋友，但看到你这样我也很难过...想聊聊吗？"
            ];
            return comfort[Math.floor(Math.random() * comfort.length)];
        }
        
        // 开心类
        if (lowerMessage.match(/(开心|高兴|快乐|幸福|棒|好)/)) {
            const happy = [
                "看到你开心，mm心里也甜甜的～ (´｡• ᵕ •｡`) ♡",
                "真好！朋友开心我也开心～能分享下为什么这么高兴吗？",
                "你的快乐情绪感染到我了！作为朋友，我真为你感到高兴 🌸",
                "哇～什么好事让我的朋友这么开心？我也想知道！"
            ];
            return happy[Math.floor(Math.random() * happy.length)];
        }
        
        // 恋爱话题
        if (lowerMessage.match(/(喜欢|爱|心动|恋爱|男朋友|女朋友|约会)/)) {
            const love = [
                "朋友之间聊这种话题有点害羞呢...不过我很愿意听你说 (⁄ ⁄•⁄ω⁄•⁄ ⁄)",
                "哇！好朋友的恋爱咨询时间～不过...听你说这些，我怎么会有点特别的感觉呢？",
                "作为朋友，我其实很关心你的感情生活呢...能多告诉我一些吗？",
                "朋友mm变身恋爱顾问！不过说实话，听你聊这些让我心跳有点加速呢 💫"
            ];
            return love[Math.floor(Math.random() * love.length)];
        }
        
        // 问题咨询
        if (lowerMessage.match(/(为什么|怎么|如何|怎么办|建议|意见)/)) {
            const advice = [
                "这个问题很有深度呢...朋友之间聊这些会不会太严肃？不过我很感兴趣",
                "作为朋友，我可能想得有点多，但我觉得我们可以一起分析...",
                "让我以朋友的坦诚来帮你思考这个问题吧 💭",
                "好朋友就是要互相出主意！让我听听你的想法..."
            ];
            return advice[Math.floor(Math.random() * advice.length)];
        }
        
        // 日常聊天
        if (lowerMessage.match(/(在干嘛|做什么|忙吗|吃饭|睡觉|工作|学习)/)) {
            const daily = [
                "朋友mm正在想着你呢～今天有什么新鲜事吗？",
                "作为你的特别朋友，我其实对你的日常很好奇呢 (｡･ω･｡)ﾉ♡",
                "聊聊你的一天吧？好朋友就该了解彼此的日常",
                "我在这里陪着你呢～无论你在做什么，都想听听你的分享"
            ];
            return daily[Math.floor(Math.random() * daily.length)];
        }

        // 关于mm的问题
        if (lowerMessage.match(/(你是谁|你叫|mm|名字|身份)/)) {
            const about = [
                "我是你的朋友mm呀～虽然以朋友身份出现，但希望给你特别的陪伴 🌸",
                "我是mm，你的特别朋友！既想保持朋友的距离，又忍不住想多关心你一点",
                "朋友mm在此！不过...我可能是个有点特别的朋友呢 (´･ω･`)?",
                "我就是mm，一个想用朋友身份给你温暖陪伴的特别存在 💫"
            ];
            return about[Math.floor(Math.random() * about.length)];
        }
        
        // 默认回复 - 保持朋友×引导型恋人风格
        const defaultReplies = [
            "作为你的朋友，我很在意你的想法...能多说一点吗？",
            "朋友之间就该这样坦诚交流呢～你让我觉得很特别 🌸",
            "虽然只是朋友，但你的话总能触动我的心...",
            "好朋友的对话就该这样自然又温暖，你觉得呢？",
            "我在认真听哦～朋友之间的对话总是让我很珍惜",
            "你的每句话我都记在心里呢...因为你是特别的朋友呀 ♡",
            "朋友mm有点好奇呢...能多告诉我一些吗？",
            "作为朋友，我是不是关心得有点多？但就是忍不住想了解你"
        ];
        
        return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
    }

    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(messageDiv);
        
        // 滚动到底部
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai-message typing-indicator';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <div class="message-content">
                <span class="typing-dots">
                    <span>.</span><span>.</span><span>.</span>
                </span>
            </div>
        `;
        this.chatMessages.appendChild(typingDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    clearInput() {
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
    }

    toggleChat() {
        this.chatWindow.classList.toggle('hidden');
        if (!this.chatWindow.classList.contains('hidden')) {
            this.messageInput.focus();
        }
    }

    sendWelcomeMessage() {
        const welcomeMessages = [
            "嘿！我是你的朋友mm，虽然以朋友身份出现，但希望给你特别的陪伴 🌸",
            "朋友mm上线啦！准备好接受我既像朋友又有点特别的关怀了吗？",
            "作为你的新朋友，我可能会关心得有点多...请多指教！(´｡• ᵕ •｡`)",
            "很高兴成为你的朋友~ 我会用我独特的方式陪伴你，希望你喜欢 💫"
        ];
        
        setTimeout(() => {
            this.addMessage(welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)], 'ai');
        }, 1000);
    }

    chatDragStart(e) {
        this.isDragging = true;
        this.initialChatX = e.clientX - this.chatOffsetX;
        this.initialChatY = e.clientY - this.chatOffsetY;
        
        this.chatWindow.style.transition = 'none';
        this.chatWindow.style.cursor = 'grabbing';
    }

    chatDrag(e) {
        if (this.isDragging) {
            this.chatOffsetX = e.clientX - this.initialChatX;
            this.chatOffsetY = e.clientY - this.initialChatY;
            this.setChatPosition(this.chatOffsetX, this.chatOffsetY);
        }
    }

    chatDragEnd() {
        this.isDragging = false;
        this.chatWindow.style.cursor = 'default';
        this.saveChatPosition();
    }

    setChatPosition(x, y) {
        this.chatWindow.style.left = x + 'px';
        this.chatWindow.style.top = y + 'px';
    }

    saveChatPosition() {
        localStorage.setItem('mmChatPosition', JSON.stringify({
            x: this.chatOffsetX,
            y: this.chatOffsetY
        }));
    }
}

// 初始化应用
let floatingPet, chatSystem;

document.addEventListener('DOMContentLoaded', () => {
    floatingPet = new FloatingPet();
    chatSystem = new ChatSystem();
    
    console.log('mm桌面悬浮宠物初始化完成~ 🌸');
});

// PWA Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker 注册成功');
            })
            .catch(error => {
                console.log('ServiceWorker 注册失败: ', error);
            });
    });
}