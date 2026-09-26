// 🔑 GIST_ID 설정
const GIST_ID = "d584cff9f66dc32942cef6c3389befd2";
const INACTIVITY_LIMIT_SECONDS = 600; // 10분

let GITHUB_TOKEN = sessionStorage.getItem('gazette_temp_token') || "";
let remainingSeconds = INACTIVITY_LIMIT_SECONDS;
let timerInterval = null;

// window 전역 객체로 공용 인증 및 테마 메서드 노출
window.GazetteAuth = {
  isAuthorized: () => Boolean(GITHUB_TOKEN && GITHUB_TOKEN.trim().startsWith('ghp_')),
  getToken: () => GITHUB_TOKEN,
  getGistId: () => GIST_ID,
  testConnection: async (token) => {
    try {
      const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },
  logout: () => {
    GITHUB_TOKEN = "";
    sessionStorage.removeItem('gazette_temp_token');
    if (window.GazetteAuth.onAuthChange) window.GazetteAuth.onAuthChange(false);
    
    if (typeof updateWidgetUI === 'function') {
      updateWidgetUI();
    }
  },
  onAuthChange: null
};

// 🌙 테마(다크모드) 즉시 초기화
(function initTheme() {
  const SAVED_THEME = localStorage.getItem('gazette_theme');
  if (SAVED_THEME === 'dark') {
    document.body.classList.add('dark-mode');
  }
})();

// 위젯 UI 업데이트 전역 선언 (동적 ADMIN PANEL 버튼 제어)
function updateWidgetUI() {
  const statusDot = document.getElementById('widget-status-dot');
  const statusText = document.getElementById('widget-status-text');
  const timerText = document.getElementById('widget-timer-text');
  const adminBtn = document.getElementById('widget-admin-btn');

  if (!statusDot || !statusText || !timerText) return;

  const authorized = window.GazetteAuth.isAuthorized();
  if (authorized) {
    statusDot.style.background = 'var(--accent-green, #2d6a4f)';
    statusText.innerText = 'PRESS 🔓';
    timerText.style.display = 'inline';
    if (adminBtn) adminBtn.style.display = 'block'; // 🔓 인증 성공 시 버튼 노출
  } else {
    statusDot.style.background = 'var(--accent-orange, #a84325)';
    statusText.innerText = 'GUEST 🔒';
    timerText.style.display = 'none';
    if (adminBtn) adminBtn.style.display = 'none'; // 🔒 미인증 시 버튼 숨김
    if (typeof stopTimer === 'function') stopTimer();
  }
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. 우측 상단 통합 컨트롤 패널 DOM 생성 (세로 정렬 지원)
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'gazette-auth-widget';
  widgetContainer.style.cssText = `
    position: fixed;
    top: 15px;
    right: 15px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    user-select: none;
  `;

  widgetContainer.innerHTML = `
    <!-- 상단 알약 패널 (테마 + 토큰 인증 상태) -->
    <div style="
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--bg-card, #faf6f0);
      border: 1.5px solid var(--border-color, #1a1a1a);
      padding: 4px 8px;
      border-radius: 20px;
      font-family: sans-serif;
      font-size: 0.7rem;
      font-weight: bold;
      box-shadow: 0 3px 10px rgba(0,0,0,0.12);
    ">
      <button type="button" id="widget-theme-toggle" style="
        background: transparent;
        border: none;
        border-right: 1px solid var(--border-subtle, #ccc);
        padding-right: 6px;
        margin-right: 2px;
        cursor: pointer;
        font-size: 0.7rem;
        font-weight: bold;
        color: var(--text-main, #1a1a1a);
        display: flex;
        align-items: center;
        gap: 3px;
      ">🌙 NIGHT</button>

      <div id="widget-auth-btn" style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
        <span id="widget-status-dot" style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-orange, #a84325);"></span>
        <span id="widget-status-text" style="color: var(--text-main, #1a1a1a);">GUEST 🔒</span>
        <span id="widget-timer-text" style="color: var(--text-muted, #666); font-weight: normal; display: none;">(10:00)</span>
      </div>
    </div>

    <!-- 하단 동적 ADMIN PANEL 바로가기 버튼 -->
    <a href="admin.html" id="widget-admin-btn" style="
      display: none;
      background: var(--text-main, #1a1a1a);
      color: var(--bg-color, #f2efe9);
      border: 1px solid var(--border-color, #1a1a1a);
      padding: 4px 10px;
      border-radius: 12px;
      font-family: sans-serif;
      font-size: 0.65rem;
      font-weight: bold;
      text-decoration: none;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      transition: transform 0.15 ease;
    ">⚙️ ADMIN PANEL &rarr;</a>
  `;

  document.body.appendChild(widgetContainer);

  const themeBtn = document.getElementById('widget-theme-toggle');
  const authBtn = document.getElementById('widget-auth-btn');

  // 2. 테마 토글 버튼
  function updateThemeBtnUI() {
    const isDark = document.body.classList.contains('dark-mode');
    themeBtn.innerHTML = isDark ? '☀️ DAY' : '🌙 NIGHT';
  }

  updateThemeBtnUI();

  themeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.body.classList.toggle('dark-mode');
    const isDarkNow = document.body.classList.contains('dark-mode');
    localStorage.setItem('gazette_theme', isDarkNow ? 'dark' : 'light');
    updateThemeBtnUI();
  });

  // 3. 인증 배지 클릭
  authBtn.addEventListener('click', async () => {
    if (window.GazetteAuth.isAuthorized()) {
      if (confirm("🔓 Gist와의 통신을 해제하고 로그아웃하시겠습니까?")) {
        window.GazetteAuth.logout();
        alert("🔒 인증이 해제되었습니다.");
      }
    } else {
      await promptAuthentication();
    }
  });

  async function promptAuthentication() {
    const inputToken = prompt("🔑 GitHub Personal Access Token (ghp_...)을 입력해 주세요:");
    if (!inputToken) return false;

    const trimmed = inputToken.replace(/\s+/g, '');
    if (!trimmed.startsWith('ghp_')) {
      alert("❌ 올바른 토큰 형식이 아닙니다 ('ghp_'로 시작해야 함).");
      return false;
    }

    const isConnected = await window.GazetteAuth.testConnection(trimmed);
    if (isConnected) {
      GITHUB_TOKEN = trimmed;
      sessionStorage.setItem('gazette_temp_token', trimmed);
      alert("🔓 Gist 클라우드 연동 성공! 관리자 권한이 활성화되었습니다.");
      if (window.GazetteAuth.onAuthChange) window.GazetteAuth.onAuthChange(true);
      updateWidgetUI();
      startTimer();
      return true;
    } else {
      alert("❌ 인증 실패: Gist와 통신할 수 없는 토큰입니다.");
      return false;
    }
  }

  // 10분 타이머 기능
  function startTimer() {
    stopTimer();
    remainingSeconds = INACTIVITY_LIMIT_SECONDS;
    updateTimerText();

    timerInterval = setInterval(() => {
      remainingSeconds--;
      updateTimerText();

      if (remainingSeconds <= 0) {
        window.GazetteAuth.logout();
        alert("⌛ 10분간 상호작용이 없어 토큰 인증이 자동 해제되었습니다.");
      }
    }, 1000);
  }

  function updateTimerText() {
    const timerText = document.getElementById('widget-timer-text');
    if (!timerText) return;
    const m = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
    const s = String(remainingSeconds % 60).padStart(2, '0');
    timerText.innerText = `(${m}:${s})`;
  }

  function resetTimer() {
    if (window.GazetteAuth.isAuthorized()) {
      remainingSeconds = INACTIVITY_LIMIT_SECONDS;
      updateTimerText();
    }
  }

  ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, resetTimer, { passive: true });
  });

  async function initCheck() {
    if (GITHUB_TOKEN) {
      const ok = await window.GazetteAuth.testConnection(GITHUB_TOKEN);
      if (ok) {
        updateWidgetUI();
        startTimer();
      } else {
        window.GazetteAuth.logout();
      }
    } else {
      updateWidgetUI();
    }
  }

  initCheck();
});
