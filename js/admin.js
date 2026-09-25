// 🔑 GIST_ID 설정 (토큰은 세션 메모리로 임시 관리)
const GIST_ID = "d584cff9f66dc32942cef6c3389befd2";
let GITHUB_TOKEN = sessionStorage.getItem('gazette_temp_token') || "";

document.addEventListener('DOMContentLoaded', () => {
  let projectsCache = [];

  const lockBtn = document.getElementById('auth-lock-btn');
  const statusBadge = document.getElementById('auth-status-badge');

  // 1. 현재 토큰 유효성 단순 검증 (Boolean)
  function isAuthorized() {
    return Boolean(GITHUB_TOKEN && GITHUB_TOKEN.trim().startsWith('ghp_'));
  }

  // 2. UI 인증 상태 업데이트
  function updateAuthUI() {
    if (isAuthorized()) {
      if (statusBadge) {
        statusBadge.innerText = "🔓 인증 완료";
        statusBadge.className = "badge auth-status-active";
      }
    } else {
      if (statusBadge) {
        statusBadge.innerText = "🔒 인증 필요";
        statusBadge.className = "badge auth-status-inactive";
      }
    }
  }

  // 3. 미인증 시 즉시 팝업을 띄우고 검증하는 가드 함수
  function requireAuth() {
    if (isAuthorized()) return true;

    const inputToken = prompt(
      "🔒 관리자 권한이 필요합니다.\nGitHub Personal Access Token (ghp_...)을 입력해 주세요:"
    );

    if (inputToken !== null) {
      const trimmed = inputToken.replace(/\s+/g, '');
      if (trimmed && trimmed.startsWith('ghp_')) {
        GITHUB_TOKEN = trimmed;
        sessionStorage.setItem('gazette_temp_token', trimmed);
        alert("🔓 인증 성공! 저장 및 삭제 권한이 활성화되었습니다.");
        updateAuthUI();
        fetchCloudProjects();
        return true;
      } else {
        alert("❌ 올바른 토큰 형식이 아닙니다 ('ghp_'로 시작해야 함).");
      }
    }
    return false;
  }

  // 4. 🔒 자물쇠 버튼 클릭 이벤트
  if (lockBtn) {
    lockBtn.addEventListener('click', () => {
      if (isAuthorized()) {
        if (confirm("현재 토큰 인증을 해제(로그아웃)하시겠습니까?")) {
          GITHUB_TOKEN = "";
          sessionStorage.removeItem('gazette_temp_token');
          alert("🔒 인증이 해제되었습니다.");
          updateAuthUI();
          fetchCloudProjects();
        }
      } else {
        requireAuth();
      }
    });
  }

  updateAuthUI();

  // 5. 이미지 파일 Base64 변환 및 압축 (최대 800px)
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

  // 6. Gist에서 데이터 읽어오기 (PULL - 조회는 가능)
  async function fetchCloudProjects() {
    if (!isAuthorized()) {
      console.warn("미인증 상태: 읽기 전용 로컬 캐시 데이터를 표시합니다.");
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
      } else {
        alert("⚠️ Gist 동기화 실패: 토큰 권한이나 GIST ID를 확인해 주세요.");
      }
    } catch (e) {
      console.error("Gist fetch error:", e);
      const saved = localStorage.getItem('gazette_projects');
      projectsCache = saved ? JSON.parse(saved) : [];
    }
    renderAdminList();
  }

  // 7. Gist 및 로컬에 데이터 저장하기 (PUSH - 미인증 시 완전 차단)
  async function saveProjectsToCloud(projects) {
    // 🛑 강력 차단 가드: 인증 실패 시 로컬 스토리지 변경도 불가능
    if (!isAuthorized()) {
      alert("🛑 [경고] 인증되지 않은 상태에서는 저장 및 수정이 절대 불가능합니다.");
      fetchCloudProjects(); // 기존 원래 데이터로 복구
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
        alert('☁️ Gist 클라우드에 성공적으로 저장되었습니다!');
      } else {
        alert('⚠️ Gist 저장 실패: 토큰 권한(gist 스코프)을 확인해 주세요.');
      }
    } catch (e) {
      alert('네트워크 오류가 발생했습니다.');
    }
    renderAdminList();
  }

  // 8. 관리자 목록 UI 출력
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
      item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid #d8d2c6;";
      
      item.innerHTML = `
        <div style="padding-right: 15px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <strong style="font-family: 'Playfair Display', serif; font-size: 1.05rem; color: #1a1a1a;">${proj.title}</strong>
            <span class="badge" style="background: ${statusBg}; color: #fff;">${proj.status}</span>
          </div>
          <p style="font-family: 'Source Serif 4', Georgia, serif; font-size: 0.82rem; color: #444; margin: 0;">${proj.headline || ''}</p>
        </div>
        
        <div style="display: flex; gap: 6px; flex-shrink: 0;">
          <a href="edit.html?id=${proj.id}" class="edit-link btn btn-primary" style="padding: 6px 12px; font-size: 0.75rem;">✏️ EDIT</a>
          <button type="button" class="delete-btn btn" data-index="${idx}" style="padding: 6px 12px; font-size: 0.75rem; background: #c84b29; color: #fff;">🗑 DELETE</button>
        </div>
      `;
      listEl.appendChild(item);
    });

    // ✏️ EDIT 버튼 제어
    listEl.querySelectorAll('.edit-link').forEach(link => {
      link.addEventListener('click', function(e) {
        if (!requireAuth()) {
          e.preventDefault(); // 미인증 시 edit.html 이동 거부
        }
      });
    });

    // 🗑 DELETE 버튼 제어
    listEl.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        if (!requireAuth()) return; // 미인증 시 즉시 취소

        const index = parseInt(this.getAttribute('data-index'), 10);
        if (confirm('이 프로젝트를 삭제하시겠습니까?')) {
          projectsCache.splice(index, 1);
          await saveProjectsToCloud(projectsCache);
        }
      });
    });
  }

  // 9. 프로젝트 추가 폼 제출 제어
  const formEl = document.getElementById('project-form');
  if (formEl) {
    formEl.addEventListener('submit', async function(e) {
      e.preventDefault();

      if (!requireAuth()) return; // 미인증 시 저장 거부
      
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

  // 10. JSON 내보내기
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

  fetchCloudProjects();
});
