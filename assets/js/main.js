/* ============================================================
   太阳花守护官网 - 主交互脚本
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 导航栏滚动效果 ---------- */
  const nav = document.getElementById('nav');
  function onScroll() {
    if (window.scrollY > 20) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 移动端菜单切换 ---------- */
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      const isOpen = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
    // 点击链接后收起菜单
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- ESC 键关闭移动端菜单 ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (navLinks && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.focus();
      }
    }
  });

  /* ---------- FAQ 折叠面板（动态高度） ---------- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');

    function setMaxHeight() {
      if (item.classList.contains('open')) {
        a.style.maxHeight = a.scrollHeight + 40 + 'px';
      }
    }

    q.addEventListener('click', function () {
      const isOpen = item.classList.contains('open');
      // 关闭所有
      document.querySelectorAll('.faq-item.open').forEach(function (o) {
        o.classList.remove('open');
        o.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
        o.querySelector('.faq-a').style.maxHeight = '0';
      });
      // 打开当前
      if (!isOpen) {
        item.classList.add('open');
        q.setAttribute('aria-expanded', 'true');
        a.style.maxHeight = a.scrollHeight + 40 + 'px';
      }
    });

    // 键盘支持：Enter 和 Space 触发 FAQ
    q.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        q.click();
      }
    });
  });

  /* ---------- 滚动渐入（使用 CSS class） ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('scroll-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.pillar, .feature, .highlight, .download-card, .privacy-band')
      .forEach(function (el) {
        el.classList.add('scroll-reveal');
        io.observe(el);
      });
  }
})();
