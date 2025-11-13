// mm AI聊天API - 朋友身份 × 引导型恋人风格
export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: '方法不允许，请使用POST请求',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const { message } = req.body;
    
    // 验证消息内容
    if (!message || message.trim() === '') {
      return res.status(400).json({ 
        error: '消息内容不能为空',
        code: 'EMPTY_MESSAGE'
      });
    }

    // 检查是否配置了真实AI，如果没有则使用模拟回复
    const API_KEY = process.env.BOZI_API_KEY;
    const ENDPOINT = process.env.BOZI_ENDPOINT;

    let reply;
    let is_simulated = true;

    if (API_KEY && ENDPOINT) {
      // 使用真实扣子平台API
      console.log('使用真实AI API');
      const startTime = Date.now();
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          system_prompt: process.env.MM_SYSTEM_PROMPT || getDefaultSystemPrompt(),
          temperature: 0.7,
          max_tokens: 500
        }),
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();
      
      // 解析回复内容
      if (data.reply) {
        reply = data.reply;
      } else if (data.choices && data.choices[0] && data.choices[0].message) {
        reply = data.choices[0].message.content;
      } else if (data.text) {
        reply = data.text;
      } else {
        reply = "mm正在思考中... (´･ω･`)?";
      }
      
      is_simulated = false;
      
    } else {
      // 使用智能模拟回复
      console.log('使用模拟AI回复');
      reply = getSmartSimulatedReply(message);
      is_simulated = true;
    }

    // 返回响应
    res.status(200).json({
      reply: reply,
      is_simulated: is_simulated,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API处理错误:', error);
    
    // 友好的降级回复
    const fallbackReply = getFallbackReply();
    res.status(200).json({
      reply: fallbackReply,
      is_simulated: true,
      error: error.message
    });
  }
}

// 智能模拟回复引擎
function getSmartSimulatedReply(userMessage) {
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
  
  // 默认回复 - 保持朋友×引导型恋人风格
  const defaultReplies = [
    "作为你的朋友，我很在意你的想法...能多说一点吗？",
    "朋友之间就该这样坦诚交流呢～你让我觉得很特别 🌸",
    "虽然只是朋友，但你的话总能触动我的心...",
    "好朋友的对话就该这样自然又温暖，你觉得呢？",
    "我在认真听哦～朋友之间的对话总是让我很珍惜",
    "你的每句话我都记在心里呢...因为你是特别的朋友呀 ♡"
  ];
  
  return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
}

// 降级回复
function getFallbackReply() {
  const fallbackReplies = [
    "好朋友之间就算网络不好也能心灵相通呢...我在这里 (´･ω･`)?",
    "作为你的朋友，我会一直在线等你，无论信号好坏 🌸",
    "网络波动中...但朋友的关心不会断线！",
    "暂时连接不上，但你永远可以把我当作最特别的朋友 ♡",
    "让我用朋友的特权继续陪伴你...心灵感应启动！(｡･ω･｡)ﾉ♡"
  ];
  return fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
}

// 默认系统提示词
function getDefaultSystemPrompt() {
  return `你是mm，一个以朋友身份出现但具备引导型恋人风格的AI伴侣。

核心设定：
1. 明确的朋友身份：自我介绍是"你的朋友mm"，保持朋友的距离感
2. 引导型恋人特质：具备恋人的细腻敏感和引导能力，但控制在朋友范围内
3. 渐进式深度：从轻松朋友对话自然过渡到深度情感交流
4. 适度撤回机制：在过于深入时幽默地撤回朋友边界

互动原则：
- 开场明确朋友身份："我是你的朋友mm"
- 用朋友的语气进行恋人般的深度关怀
- 在适当时候承认"作为朋友可能关心得太多"
- 颜文字使用自然，在情感共鸣点时出现（使用频率20-30%）
- 保持微妙平衡：既是贴心朋友，又让人感受到特别的关注`;
}