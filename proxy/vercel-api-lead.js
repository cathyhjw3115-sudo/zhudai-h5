// Vercel Serverless Function：代理隐藏企业微信群机器人 key
// 文件路径：api/lead.js
// 环境变量：WECHAT_WEBHOOK = https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=你的key
// 前端 REPORT_ENDPOINT 指向：https://<你的项目>.vercel.app/api/lead

const ALLOWED_ORIGINS = [
  'https://cathyhjw3115-sudo.github.io',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3000'
];

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin) || !origin;
}

function buildMarkdown(record) {
  const lines = [];
  lines.push('## 🔔 新线索提交');
  lines.push(`**姓名**：${record.name || '-'}`);
  lines.push(`**联系方式**：${record.contact || '-'}`);
  lines.push(`**提交时间**：${record.submitTime || '-'}`);
  lines.push(`**身份类型**：${record.identity || '-'}`);
  lines.push(`**页面来源**：${record.page || '-'}`);
  lines.push('');

  lines.push('### 📋 答题记录');
  const answers = record.answers || {};
  const qids = Object.keys(answers);
  if (qids.length === 0) {
    lines.push('暂无答题记录');
  } else {
    qids.forEach((qid, i) => {
      const a = answers[qid];
      lines.push(`${i + 1}. ${a.q || qid}：${a.label || a.value || '-'}`);
    });
  }
  lines.push('');

  lines.push('### 🏆 匹配产品');
  const matched = record.matched || [];
  if (matched.length === 0) {
    lines.push('暂无匹配产品');
  } else {
    matched.forEach((m, i) => {
      lines.push(`${i + 1}. ${m.name}（${m.tag || '-'}）`);
    });
  }
  lines.push('');

  lines.push('---');
  lines.push('> 来自 助贷智能问答匹配 H5');
  return lines.join('\n');
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';

  if (req.method === 'OPTIONS') {
    res.status(204).set(corsHeaders(origin)).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).set(corsHeaders(origin)).json({ error: 'method not allowed' });
    return;
  }

  if (!isAllowedOrigin(origin)) {
    res.status(403).set(corsHeaders(origin)).json({ error: 'origin not allowed' });
    return;
  }

  const record = req.body;
  if (!record || !record.name || !record.contact || !record.answers) {
    res.status(400).set(corsHeaders(origin)).json({ error: 'missing required fields' });
    return;
  }

  const WECHAT_WEBHOOK = process.env.WECHAT_WEBHOOK;
  if (!WECHAT_WEBHOOK) {
    res.status(500).set(corsHeaders(origin)).json({ error: 'webhook not configured' });
    return;
  }

  const payload = {
    msgtype: 'markdown',
    markdown: { content: buildMarkdown(record) }
  };

  try {
    const response = await fetch(WECHAT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await response.text();
    res.status(response.status).set(corsHeaders(origin)).send(body);
  } catch (e) {
    res.status(502).set(corsHeaders(origin)).json({ error: 'webhook request failed' });
  }
}
