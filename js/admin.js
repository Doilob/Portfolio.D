// 🔑 GIST_ID 설정
const GIST_ID = "d584cff9f66dc32942cef6c3389befd2";
let GITHUB_TOKEN = sessionStorage.getItem('gazette_temp_token') || "";

// ⏱️ 10분 타이머 설정 (600초)
const INACTIVITY_LIMIT_SECONDS = 600;
let remainingSeconds = INACTIVITY_LIMIT_SECONDS;
let timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  let projectsCache = [];

  const lockBtn = document.getElementById('auth-lock-btn');
  const statusBadge = document.getElementById('auth-status-badge');

  // 10분 카운트다운 타이머 UI 요소를 버튼 밑에 동적 생성
  let timerDisplay = document.getElementById('auth-timer-display');
  if (!timerDisplay && lockBtn && lockBtn.parentElement) {
    timerDisplay = document.createElement('div');
    timerDisplay.id = 'auth-timer-display';
    timerDisplay.style.cssText = "font-size: 0.72rem; color: var(--text-muted, #666); text-align: center; margin-top: 6px; font-family: sans-serif;";
    lockBtn.parentElement.appendChild(timerDisplay);
  }

  // 1. 인증 상태 확인 (Boolean)
  function isAuthorized() {
    return Boolean(GITHUB_TOKEN && GITHUB_TOKEN.trim().startsWith('ghp_'));
  }

  // 2-1 & 2-2. Gist 통신 직접 연결 테스트 함수
  async function testGistConnection(token) {
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
  }

  // UI 인증 상태 및 버튼 텍스트 업데이트
  function updateAuthUI() {
    if (isAuthorized()) {
      if (statusBadge) {
        statusBadge.innerText = "🔓 인증 완료";
        statusBadge.className = "badge auth-status-active";
      }
      if (lockBtn) {
        lockBtn.innerText = "🔓 Gist와 통신 끊기";
        lockBtn.className = "btn btn-secondary btn-block";
      }
    } else {
      if (statusBadge) {
        statusBadge.innerText = "🔒 인증 필요";
        statusBadge.className = "badge auth-status-inactive";
      }
      if (lockBtn) {
        lockBtn.innerText = "🔒 토큰 인증하기";
        lockBtn.className = "btn btn-primary btn-block";
      }
      if (timerDisplay) {
        timerDisplay.innerText = "";
      }
      stopInactivityTimer();
    }
  }

  // 3. 10분 타이머 시작 및 UI 업데이트
  function startInactivityTimer() {
    stopInactivityTimer();
    remainingSeconds = INACTIVITY_LIMIT_SECONDS;
    updateTimerUI();

    timerInterval = setInterval(() => {
      remainingSeconds--;
      updateTimerUI();

      if (remainingSeconds <= 0) {
        handleAutoLogoutDueToInactivity();
      }
    }, 1000);
  }

  function stopInactivityTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function resetInactivityTimer() {
    if (isAuthorized()) {
      remainingSeconds = INACTIVITY_LIMIT_SECONDS;
      updateTimerUI();
    }
  }

  function updateTimerUI() {
    if (!timerDisplay || !isAuthorized()) return;
    const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
    const seconds = String(remainingSeconds % 60).padStart(2, '0');
    timerDisplay.innerText = `⏱️ 자동 해제까지: ${minutes}:${seconds}`;
  }

  function handleAutoLogoutDueToInactivity() {
    GITHUB_TOKEN = "";
    sessionStorage.removeItem('gazette_temp_token');
    updateAuthUI();
    fetchCloudProjects();
    alert("⌛ 10분간 아무 상호작용이 없어 토큰 인증이 자동 해제되었습니다.");
  }

  // 사용자의 상호작용(마우스, 키보드, 클릭, 스크롤, 터치) 감지 시 타이머 리셋
  ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evtType => {
    window.addEventListener(evtType, () => {
      if (isAuthorized()) {
        resetInactivityTimer();
      }
    }, { passive: true });
  });

  // 2. 토큰 인증 시도 메인 프로세스
  async function performAuthentication() {
    const inputToken = prompt(
      "🔑 GitHub Personal Access Token (ghp_...)을 입력해 주세요:"
    );

    if (!inputToken) return false;

    const trimmed = inputToken.replace(/\s+/g, '');
    if (!trimmed.startsWith('ghp_')) {
      alert("❌ 올바른 토큰 형식이 아닙니다 ('ghp_'로 시작해야 합니다).");
      return false;
    }

    // Gist와 원활하게 교류되는지 직접 확인 (2-1 / 2-2)
    const isConnected = await testGistConnection(trimmed);

    if (isConnected) {
      // 2-1: 성공
      GITHUB_TOKEN = trimmed;
      sessionStorage.setItem('gazette_temp_token', trimmed);
      alert("🔓 Gist 통신 연동에 성공하여 인증이 완료되었습니다!");
      updateAuthUI();
      startInactivityTimer(); // 10분 타이머 작동 시작
      fetchCloudProjects();
      return true;
    } else {
      // 2-2: 실패
      GITHUB_TOKEN = "";
      sessionStorage.removeItem('gazette_temp_token');
      alert("❌ 토큰 인증 실패: 입력한 토큰으로 Gist와 연동할 수 없습니다.\n권한(gist)이나 GIST ID를 확인해 주세요.");
      updateAuthUI();
      return false;
    }
  }

  // 버튼 클릭 이벤트
  if (lockBtn) {
    lockBtn.addEventListener('click', async () => {
      if (isAuthorized()) {
        if (confirm("Gist와의 통신을 끊고 인증을 해제하시겠습니까?")) {
          GITHUB_TOKEN = "";
          sessionStorage.removeItem('gazette_temp_token');
          alert("🔓 Gist와의 통신이 해제되었습니다.");
          updateAuthUI();
          fetchCloudProjects();
        }
      } else {
        await performAuthentication();
      }
    });
  }

  // 초기 로드 시 기존 세션 토큰 연동 유효성 재확인
  async function initAuthCheck() {
    if (GITHUB_TOKEN) {
      const isConnected = await testGistConnection(GITHUB_TOKEN);
      if (isConnected) {
        updateAuthUI();
        startInactivityTimer();
      } else {
        GITHUB_TOKEN = "";
        sessionStorage.removeItem('gazette_temp_token');
        updateAuthUI();
      }
    } else {
      updateAuthUI();
    }
    fetchCloudProjects();
  }

  // 1. 미인증 시 완전 저장 차단 함수
  async function saveProjectsToCloud(projects) {
    if (!isAuthorized()) {
      alert("🛑 [경고] 인증되지 않은 상태에서는 저장, 수정, 삭제가 완전히 불가능합니다.");
      fetchCloudProjects(); // 원본 상태로 복원
      return;
    }

    localStorage.setItem('gazette_projects', JSON.stringify(projects, null, 2));

    try {
      const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            'projects.json': {
              content: JSON.stringify(projects, null, 2)
            }
          }
        })
      });

      if (res.ok) {
        alert('☁️ Gist 클라우드에 성공적으로 반영되었습니다!');
      } else {
        alert('⚠️ Gist 저장 실패: 토큰 권한을 확인해 주세요.');
      }
    } catch (e) {
      alert('네트워크 오류가 발생했습니다.');
    }
    renderAdminList();
  }

  // Gist 데이터 읽기
  async function fetchCloudProjects() {
    if (!isAuthorized()) {
      const saved = localStorage.getItem('gazette_projects');
      projectsCache = saved ? JSON.parse(saved) : [];
      renderAdminList();
      return;
    }

    try {
      const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (res.ok) {
        const gistData = await res.json();
        const fileContent = gistData.files['projects.json']?.content;
        projectsCache = fileContent ? JSON.parse(fileContent) : [];
        localStorage.setItem('gazette_projects', JSON.stringify(projectsCache, null, 2));
      }
    } catch (e) {
      console.error("Gist fetch error:", e);
      const saved = localStorage.getItem('gazette_projects');
      projectsCache = saved ? JSON.parse(saved) : [];
    }
    renderAdminList();
  }

  // 이미지 압축 헬퍼
  function compressAndConvertToBase64(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const base64Data = canvas.toDataURL('image/jpeg', quality);
          resolve(base64Data);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }

  // 관리자 목록 출력 및 미인증 액션 거부
  function renderAdminList() {
    const listEl = document.getElementById('admin-projects-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (projectsCache.length === 0) {
      listEl.innerHTML = '<p class="form-help-text">등록된 프로젝트가 없습니다.</p>';
      return;
    }

    projectsCache.forEach((proj, idx) => {
      let statusBg = '#c84b29';
      if (proj.status === 'COMPLETED') statusBg = '#2d6a4f';
      if (proj.status === 'DROPPED') statusBg = '#6c757d';

      const item = document.createElement('div');
      item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--border-subtle, #d8d2c6);";
      
      item.innerHTML = `
        <div style="padding-right: 15px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <strong style="font-family: 'Playfair Display', serif; font-size: 1.05rem; color: var(--text-main, #1a1a1a);">${proj.title}</strong>
            <span class="badge" style="background: ${statusBg}; color: #fff;">${proj.status}</span>
          </div>
          <p style="font-family: 'Source Serif 4', Georgia, serif; font-size: 0.82rem; color: var(--text-muted, #444); margin: 0;">${proj.headline || ''}</p>
        </div>
        
        <div style="display: flex; gap: 6px; flex-shrink: 0;">
          <a href="edit.html?id=${proj.id}" class="edit-link btn btn-primary" style="padding: 6px 12px; font-size: 0.75rem;">✏️ EDIT</a>
          <button type="button" class="delete-btn btn" data-index="${idx}" style="padding: 6px 12px; font-size: 0.75rem; background: var(--accent-orange, #c84b29); color: #fff;">🗑 DELETE</button>
        </div>
      `;
      listEl.appendChild(item);
    });

    // EDIT 제어
    listEl.querySelectorAll('.edit-link').forEach(link => {
      link.addEventListener('click', async function(e) {
        if (!isAuthorized()) {
          e.preventDefault(); // 미인증 시 접근 차단
          const ok = await performAuthentication();
          if (ok) {
            window.location.href = this.href;
          }
        }
      });
    });

    // DELETE 제어 (미인증 시 차단)
    listEl.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        if (!isAuthorized()) {
          const ok = await performAuthentication();
          if (!ok) return;
        }

        const index = parseInt(this.getAttribute('data-index'), 10);
        if (confirm('이 프로젝트를 삭제하고 Gist 클라우드에 반영하시겠습니까?')) {
          projectsCache.splice(index, 1);
          await saveProjectsToCloud(projectsCache);
        }
      });
    });
  }

  // 신규 등록 제어 (미인증 시 차단)
  const formEl = document.getElementById('project-form');
  if (formEl) {
    formEl.addEventListener('submit', async function(e) {
      e.preventDefault();

      if (!isAuthorized()) {
        const ok = await performAuthentication();
        if (!ok) return;
      }

      const fileInput = document.getElementById('p-image-file');
      let base64Image = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';

      if (fileInput && fileInput.files.length > 0) {
        try {
          base64Image = await compressAndConvertToBase64(fileInput.files[0]);
        } catch (err) {
          alert('이미지 처리 중 오류가 발생했습니다.');
        }
      }

      const newProj = {
        id: 'proj-' + Date.now(),
        title: document.getElementById('p-title').value,
        status: document.getElementById('p-status').value,
        badgeTag: document.getElementById('p-tag').value || 'PROJECT',
        headline: document.getElementById('p-headline').value,
        author: document.getElementById('p-author').value || 'by Author',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        image: base64Image,
        summary: document.getElementById('p-summary').value
      };

      projectsCache.unshift(newProj);
      await saveProjectsToCloud(projectsCache);
      this.reset();
    });
  }

  // JSON 내보내기
  const exportBtn = document.getElementById('export-json-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectsCache, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "projects.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }

  initAuthCheck();
});
