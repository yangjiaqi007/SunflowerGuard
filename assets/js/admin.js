/* ============================================================
   太阳花守护后台 - 下载统计展示
   ------------------------------------------------------------
   WORKER_URL 在 config.js 中统一配置。
   Token 通过 Authorization: Bearer xxx header 传递。
   ============================================================ */
(function () {
  'use strict';

  const form = document.getElementById('loginForm');
  const tokenInput = document.getElementById('token');
  const errEl = document.getElementById('err');
  const statsEl = document.getElementById('stats');
  let currentToken = '';

  function showError(msg) {
    errEl.textContent = msg || '';
  }

  async function loadStats(token) {
    const workerUrl = window.SG_CONFIG && window.SG_CONFIG.WORKER_URL;
    if (!workerUrl) {
      showError('尚未配置 Worker URL，请编辑 config.js 填入 WORKER_URL。');
      return;
    }
    showError('');
    try {
      const res = await fetch(workerUrl.replace(/\/$/, '') + '/api/stats', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer ' + token
        }
      });
      if (res.status === 401) {
        showError('Token 不正确，请检查后重试。');
        return;
      }
      if (!res.ok) {
        showError('查询失败（HTTP ' + res.status + '）。');
        return;
      }
      const data = await res.json();
      const p = data.platforms || {};
      document.getElementById('totalNum').textContent = data.total || 0;
      document.getElementById('n-android').textContent = p.android || 0;
      document.getElementById('n-harmonyos').textContent = p.harmonyos || 0;
      document.getElementById('n-ios').textContent = p.ios || 0;
      statsEl.classList.add('show');
      form.querySelector('button').textContent = '重新登录';
    } catch (e) {
      showError('网络错误：' + (e && e.message ? e.message : '无法连接 Worker'));
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    currentToken = tokenInput.value.trim();
    if (!currentToken) { showError('请输入 Token。'); return; }
    loadStats(currentToken);
  });

  document.getElementById('refresh').addEventListener('click', function () {
    if (currentToken) loadStats(currentToken);
  });
})();
