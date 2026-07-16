// Cloudflare Worker：代理隐藏企业微信群机器人 key
// 环境变量：WECHAT_WEBHOOK = https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=你的key
// 前端 REPORT_ENDPOINT 指向：https://<你的子域>.workers.dev/api/lead

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

async function handleLead(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (!isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ error: 'origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }

  let record;
  try {
    record = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }

  if (!record.name || !record.contact || !record.answers) {
    return new Response(JSON.stringify({ error: 'missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }

  const WECHAT_WEBHOOK = env.WECHAT_WEBHOOK;
  if (!WECHAT_WEBHOOK) {
    return new Response(JSON.stringify({ error: 'webhook not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }

  const payload = {
    msgtype: 'markdown',
    markdown: { content: buildMarkdown(record) }
  };

  try {
    const res = await fetch(WECHAT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'webhook request failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === '/api/lead' && request.method === 'POST') {
      return handleLead(request, env);
    }

    return new Response(JSON.stringify({ error: 'not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }
};
