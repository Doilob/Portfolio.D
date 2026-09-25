// 🔑 GIST_ID 설정
const GIST_ID = "본인의_32자리_GIST_ID";
let GITHUB_TOKEN = sessionStorage.getItem('gazette_temp_token') || "";

document.addEventListener('DOMContentLoaded', () => {
  let projectsCache = [];

  const lockBtn = document.getElementById('auth-lock-btn');
  const statusBadge = document.getElementById('auth-status-badge');

  // 1. 토큰 인증 상태에 따른 UI 업데이트
  function updateAuthUI() {
    if (GITHUB_TOKEN && GITHUB_TOKEN.trim().startsWith('ghp_')) {
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

  // 2. 인증 필수 체크 함수 (인증되지 않았으면 prompt로 즉시 요청)
  function requireAuth() {
    if (GITHUB_TOKEN && GITHUB_TOKEN.trim().startsWith('ghp_')) {
      return true; // 이미 인증됨
    }

    const inputToken = prompt(
      "🔒 프로젝트 수정 및 삭제를 하려면 GitHub Personal Access Token (ghp_...) 인증이 필요합니다.\n토큰을 입력해 주세요:"
    );

    if (inputToken !== null) {
      const trimmed = inputToken.trim();
      if (trimmed && trimmed.startsWith('ghp_')) {
        GITHUB_TOKEN = trimmed;
        sessionStorage.setItem('gazette_temp_token', trimmed);
        alert("🔓 인증에 성공하였습니다!");
        updateAuthUI();
        fetchCloudProjects(); // 인증 후 최신 데이터 동기화
        return true;
      } else {
        alert("❌ 올바른 GitHub 토큰(ghp_...)이 아닙니다. 작업을 취소합니다.");
      }
    }
    return false; // 인증 실패/취소
  }

  // 3. 🔒 자물쇠 버튼 클릭 이벤트
  if (lockBtn) {
    lockBtn.addEventListener('click', () => {
      if (GITHUB_TOKEN) {
        if (confirm("현재 토큰 인증을 해제(로그아웃)하시겠습니까?")) {
          GITHUB_TOKEN = "";
          sessionStorage.removeItem('gazette_temp_token');
          alert("🔒 인증이 해제되었습니다.");
          updateAuthUI();
        }
      } else {
        requireAuth();
      }
    });
  }

  updateAuthUI();

  // 4. 이미지 파일 Base64 변환 및 압축 (최대 800px)
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

  // 5. Gist에서 데이터 읽어오기 (PULL)
  async function fetchCloudProjects() {
    if (!GITHUB_TOKEN) {
      console.warn("토큰 미인증 상태 - 로컬 스토리지 데이터 표시");
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

  // 6. Gist로 데이터 저장하기 (PUSH)
  async function saveProjectsToCloud(projects) {
    localStorage.setItem('gazette_projects', JSON.stringify(projects, null, 2));

    if (!GITHUB_TOKEN) {
      alert("⚠️ 토큰 인증이 필요합니다.");
      return;
    }

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
        alert('⚠️ Gist 저장 실패: 토큰 권한(gist 스코프)을 확인해 주세요.');
      }
    } catch (e) {
      alert('네트워크 오류로 로컬 저장소에만 반영되었습니다.');
    }
    renderAdminList();
  }

  // 7. 관리자 목록 UI 출력 (인증 검증 이벤트 추가)
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

    // ✏️ EDIT 버튼 클릭 시 토큰 인증 확인
    listEl.querySelectorAll('.edit-link').forEach(link => {
      link.addEventListener('click', function(e) {
        if (!requireAuth()) {
          e.preventDefault(); // 인증 실패 시 edit.html 이동 차단
        }
      });
    });

    // 🗑 DELETE 버튼 클릭 시 토큰 인증 확인
    listEl.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        if (!requireAuth()) return; // 인증 실패 시 삭제 차단

        const index = parseInt(this.getAttribute('data-index'), 10);
        if (confirm('이 프로젝트를 삭제하고 Gist 클라우드에 반영하시겠습니까?')) {
          projectsCache.splice(index, 1);
          await saveProjectsToCloud(projectsCache);
        }
      });
    });
  }

  // 8. 프로젝트 추가 폼 제출 시 토큰 인증 확인
  const formEl = document.getElementById('project-form');
  if (formEl) {
    formEl.addEventListener('submit', async function(e) {
      e.preventDefault();

      if (!requireAuth()) return; // 인증 실패 시 추가 차단
      
      const fileInput = document.getElementById('p-image-file');
      let base64Image = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';

      if (fileInput && fileInput.files.length > 0) {
        try {
          base64Image = await compressAndConvertToBase64(fileInput.files[0]);
        } catch (err) {
          alert('이미지 처리 중 오류가 발생했습니다. 기본 이미지를 사용합니다.');
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

  // 9. JSON 내보내기
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
