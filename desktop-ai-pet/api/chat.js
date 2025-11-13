// api/chat.js - 扣子平台专用版本
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, conversation_id = `conv_${Date.now()}` } = req.body;

  // 输入验证
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: '消息内容不能为空' });
  }

  try {
    // 扣子平台API请求
    const response = await fetch('https://api.coze.cn/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.BOZI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id: conversation_id,
        bot_id: process.env.BOZI_BOT_ID, // 新增：机器人ID
        user: "user_desktop_pet", // 用户标识
        query: message,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('扣子API响应错误:', response.status, errorText);
      throw new Error(`API响应错误: ${response.status}`);
    }

    const data = await response.json();
    
    // 解析扣子平台响应格式
    let reply = "mm暂时想不到怎么回答呢...";
    
    if (data.messages && data.messages.length > 0) {
      // 扣子平台返回的消息数组，取第一个assistant消息
      const assistantMessage = data.messages.find(msg => msg.role === 'assistant');
      if (assistantMessage && assistantMessage.content) {
        reply = assistantMessage.content;
      }
    }
    
    // 记录成功日志
    console.log('扣子API调用成功:', {
      userMessage: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      replyLength: reply.length,
      conversation_id: conversation_id
    });

    res.status(200).json({ 
      reply,
      conversation_id: data.conversation_id || conversation_id
    });
    
  } catch (error) {
    console.error('扣子API调用失败:', error);
    
    // 优雅的降级回复 - 保持mm角色风格
    const fallbackReplies = [
      "哎呀，网络好像有点调皮～不过mm还在这里陪你聊天呢 (´･ω･`)",
      "刚刚走神了一下下，能再说一次吗？我保证认真听！",
      "虽然连接有点小波动，但mm的陪伴不会断线哦～",
      "嗯...现在信号不太好，但我们的对话可以继续 💭"
    ];
    
    const randomReply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
    
    res.status(200).json({ 
      reply: randomReply,
      fallback: true,
      conversation_id: conversation_id
    });
  }
}