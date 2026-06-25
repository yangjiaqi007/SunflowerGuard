/* ============================================================
   太阳花守护官网 - 下载计数埋点
   ------------------------------------------------------------
   WORKER_URL 在 config.js 中统一配置。
   LINKS 需在此处填写三平台安装包直链。
   ============================================================ */
(function () {
  'use strict';

  const LINKS = {
    ios: '#',
    harmonyos: '#',
    android: 'https://github.com/yangjiaqi007/SunflowerGuard/releases/download/V3.2.0/SunflowerGuard_Android.apk'
  };

  const NAMES = {
    ios: 'iOS',
    harmonyos: 'HarmonyOS（鸿蒙）',
    android: 'Android'
  };

  const APPLE_SVG = '<svg viewBox="-5 -5 25 32" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.702"/></svg>';

  const ICONS = {
    ios: APPLE_SVG,
    harmonyos: '📱',
    android: '🤖'
  };

  /* 发送计数（不阻塞下载跳转） */
  function track(platform) {
    const workerUrl = window.SG_CONFIG && window.SG_CONFIG.WORKER_URL;
    if (!workerUrl) return;
    try {
      const url = workerUrl.replace(/\/$/, '') +
        '/api/track?platform=' + encodeURIComponent(platform);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url);
      } else {
        fetch(url, { method: 'POST', keepalive: true }).catch(function () {});
      }
    } catch (e) {
      /* 计数失败不影响下载 */
    }
  }

  /* 跳转下载 */
  function go(platform, btn) {
    const link = LINKS[platform];
    if (!link || link === '#' || link === '') {
      const name = NAMES[platform] || platform;
      const origHTML = btn.innerHTML;
      const icon = ICONS[platform] || '⏳';
      btn.innerHTML = '<span class="dl-icon">' + icon + '</span><span>' + name + ' 版即将上线</span>';
      btn.classList.add('is-coming-soon');
      setTimeout(function () {
        btn.innerHTML = origHTML;
        btn.classList.remove('is-coming-soon');
      }, 1600);
      return;
    }
    window.open(link, '_blank');
  }

  /* 绑定所有带 data-platform 的下载按钮（首页 Hero + 下载区） */
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-platform]');
    if (!btn) return;
    e.preventDefault();
    const platform = btn.getAttribute('data-platform');
    if (!LINKS.hasOwnProperty(platform)) return;
    track(platform);
    go(platform, btn);
  });
})();
