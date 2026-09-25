// 🔑 GIST_ID 설정 (토큰은 코드에 보관하지 않고 사용 시 세션 메모리에만 유지)
const GIST_ID = "d584cff9f66dc32942cef6c3389befd2";
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

  // 2. 🔒 버튼 클릭 시 토큰 직접 입력 (prompt 사용)
  if (lockBtn) {
    lockBtn.addEventListener('click', () => {
      const inputToken = prompt(
        "GitHub Personal Access Token (ghp_...)을 입력해 주세요.\n입력된 토큰은 탭을 닫기 전까지 메모리에만 임시 보관됩니다:",
        GITHUB_TOKEN
      );

      if (inputToken !== null) {
        const trimmed = inputToken.trim();
        if (trimmed) {
          GITHUB_TOKEN = trimmed;
          sessionStorage.setItem('gazette_temp_token', trimmed);
          alert("🔑 토큰이 임시 저장되었습니다.");
          updateAuthUI();
          fetchCloudProjects();
        } else {
          GITHUB_TOKEN = "";
          sessionStorage.removeItem('gazette_temp_token');
          alert("토큰이 해제되었습니다.");
          updateAuthUI();
        }
      }
    });
  }

  updateAuthUI();

  // 3. 이미지 파일 Base64 변환 및 압축 (최대 800px)
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

  // 4. Gist에서 데이터 읽어오기 (PULL)
  async function fetchCloudProjects() {
    if (!GITHUB_TOKEN) {
      console.warn("토큰이 설정되지 않아 로컬 스토리지 데이터를 표시합니다.");
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

  // 5. Gist로 데이터 저장하기 (PUSH)
  async function saveProjectsToCloud(projects) {
    localStorage.setItem('gazette_projects', JSON.stringify(projects, null, 2));

    if (!GITHUB_TOKEN) {
      alert("⚠️ 토큰이 입력되지 않아 로컬 스토리지에만 저장되었습니다.\n상단의 🔒 토큰 인증하기 버튼을 눌러주세요.");
      renderAdminList();
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

  // 6. 관리자 목록 UI 출력
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
          <a href="edit.html?id=${proj.id}" class="btn btn-primary" style="padding: 6px 12px; font-size: 0.75rem;">✏️ EDIT</a>
          <button type="button" class="delete-btn btn" data-index="${idx}" style="padding: 6px 12px; font-size: 0.75rem; background: #c84b29; color: #fff;">🗑 DELETE</button>
        </div>
      `;
      listEl.appendChild(item);
    });

    // 삭제 이벤트
    listEl.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const index = parseInt(this.getAttribute('data-index'), 10);
        if (confirm('이 프로젝트를 삭제하고 Gist 클라우드에 반영하시겠습니까?')) {
          projectsCache.splice(index, 1);
          await saveProjectsToCloud(projectsCache);
        }
      });
    });
  }

  // 7. 폼 제출 (프로젝트 추가)
  const formEl = document.getElementById('project-form');
  if (formEl) {
    formEl.addEventListener('submit', async function(e) {
      e.preventDefault();
      
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

  // 8. JSON 내보내기
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
