// 🔑 GIST_ID 설정
const GIST_ID = "d584cff9f66dc32942cef6c3389befd2";
const INACTIVITY_LIMIT_SECONDS = 600; // 10분

let GITHUB_TOKEN = sessionStorage.getItem('gazette_temp_token') || "";
let remainingSeconds = INACTIVITY_LIMIT_SECONDS;
let timerInterval = null;

// window 전역 객체로 공용 인증 메서드 노출
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
    updateWidgetUI();
  },
  onAuthChange: null
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. 화면 우측 상단 미니 프레스 배지 위젯 동적 삽입
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'gazette-auth-widget';
  widgetContainer.style.cssText = `
    position: fixed;
    top: 15px;
    right: 15px;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-card, #faf6f0);
    border: 1px solid var(--border-color, #1a1a1a);
    padding: 5px 10px;
    border-radius: 20px;
    font-family: sans-serif;
    font-size: 0.7rem;
    font-weight: bold;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    cursor: pointer;
    user-select: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  `;

  widgetContainer.innerHTML = `
    <span id="widget-status-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #c84b29;"></span>
    <span id="widget-status-text" style="color: var(--text-main, #1a1a1a);">GUEST 🔒</span>
    <span id="widget-timer-text" style="color: var(--text-muted, #666); font-weight: normal; display: none;">(10:00)</span>
  `;

  document.body.appendChild(widgetContainer);

  const statusDot = document.getElementById('widget-status-dot');
  const statusText = document.getElementById('widget-status-text');
  const timerText = document.getElementById('widget-timer-text');

  // 호버 효과
  widgetContainer.addEventListener('mouseenter', () => {
    widgetContainer.style.transform = 'scale(1.04)';
  });
  widgetContainer.addEventListener('mouseleave', () => {
    widgetContainer.style.transform = 'scale(1)';
  });

  // 위젯 클릭 시 인증 / 해제 팝업
  widgetContainer.addEventListener('click', async () => {
    if (window.GazetteAuth.isAuthorized()) {
      if (confirm("🔓 Gist와의 통신을 해제하고 로그아웃하시겠습니까?")) {
        window.GazetteAuth.logout();
        alert("🔒 인증이 해제되었습니다.");
      }
    } else {
      await promptAuthentication();
    }
  });

  // 토큰 입력 및 검증 팝업
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

  // 위젯 UI 업데이트
  function updateWidgetUI() {
    const authorized = window.GazetteAuth.isAuthorized();
    if (authorized) {
      statusDot.style.background = '#2d6a4f'; // 녹색
      statusText.innerText = 'PRESS 🔓';
      timerText.style.display = 'inline';
    } else {
      statusDot.style.background = '#c84b29'; // 주황색
      statusText.innerText = 'GUEST 🔒';
      timerText.style.display = 'none';
      stopTimer();
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

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateTimerText() {
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

  // 상호작용 리셋 이벤트
  ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, resetTimer, { passive: true });
  });

  // 초기 로드 검증
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
