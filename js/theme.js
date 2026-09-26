// 🌙 Night Gazette 테마 스위처 스크립트
(function () {
  const SAVED_THEME = localStorage.getItem('gazette_theme');
  
  // 페이지 로드 전 다크모드 상태 즉시 적용 (화면 찌꺼기 방지)
  if (SAVED_THEME === 'dark') {
    document.body.classList.add('dark-mode');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.top-nav');
    if (!nav) return;

    // 상단 네비게이션에 🌙 NIGHT EDITION 버튼 자동 생성
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'theme-toggle-btn';
    
    function updateBtnLabel() {
      const isDark = document.body.classList.contains('dark-mode');
      toggleBtn.innerHTML = isDark ? '☀️ DAY EDITION' : '🌙 NIGHT EDITION';
    }

    updateBtnLabel();

    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDarkNow = document.body.classList.contains('dark-mode');
      localStorage.setItem('gazette_theme', isDarkNow ? 'dark' : 'light');
      updateBtnLabel();
    });

    nav.appendChild(toggleBtn);
  });
})();
