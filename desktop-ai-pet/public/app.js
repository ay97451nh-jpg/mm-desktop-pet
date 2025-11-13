// 在 ChatSystem 类中更新
class ChatSystem {
  constructor() {
    this.conversationId = `mm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.messageHistory = [];
  }

  async sendMessage(message) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          conversation_id: this.conversationId
        })
      });

      const data = await response.json();
      
      // 更新会话ID（如果API返回新的）
      if (data.conversation_id) {
        this.conversationId = data.conversation_id;
      }
      
      return data.reply;
      
    } catch (error) {
      console.error('发送消息失败:', error);
      return "网络连接不太稳定呢...不过mm会一直在这里 (◕‿◕)";
    }
  }
}