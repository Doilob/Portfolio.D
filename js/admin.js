document.addEventListener('DOMContentLoaded', () => {
  let projectsCache = [];

  // 전역 인증 상태 변경 시 목록 재갱신
  if (window.GazetteAuth) {
    window.GazetteAuth.onAuthChange = () => {
      fetchCloudProjects();
    };
  }

  function isAuthorized() {
    return window.GazetteAuth && window.GazetteAuth.isAuthorized();
  }

  function getGistId() {
    return window.GazetteAuth ? window.GazetteAuth.getGistId() : "";
  }

  function getToken() {
    return window.GazetteAuth ? window.GazetteAuth.getToken() : "";
  }

  // Gist 클라우드에서 프로젝트 불러오기
  async function fetchCloudProjects() {
    if (!isAuthorized()) {
      const saved = localStorage.getItem('gazette_projects');
      projectsCache = saved ? JSON.parse(saved) : [];
      renderAdminList();
      return;
    }

    try {
      const res = await fetch(`https://api.github.com/gists/${getGistId()}`, {
        headers: {
          'Authorization': `token ${getToken()}`,
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

  // Gist 클라우드에 저장
  async function saveProjectsToCloud(projects) {
    if (!isAuthorized()) {
      alert("🛑 [경고] 인증되지 않은 상태에서는 저장, 수정, 삭제가 불가능합니다. 우측 상단의 [GUEST 🔒] 배지를 클릭하여 먼저 인증해 주세요.");
      fetchCloudProjects();
      return;
    }

    localStorage.setItem('gazette_projects', JSON.stringify(projects, null, 2));

    try {
      const res = await fetch(`https://api.github.com/gists/${getGistId()}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${getToken()}`,
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

  // 관리자 프로젝트 목록 출력
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

    // ✏️ EDIT 버튼 토큰 인증 가드
    listEl.querySelectorAll('.edit-link').forEach(link => {
      link.addEventListener('click', function(e) {
        if (!isAuthorized()) {
          e.preventDefault();
          alert("🔒 수정 기능은 토큰 인증이 필요합니다. 우측 상단의 [GUEST 🔒] 배지를 클릭해 먼저 인증해 주세요.");
        }
      });
    });

    // 🗑 DELETE 버튼 토큰 인증 가드
    listEl.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        if (!isAuthorized()) {
          alert("🔒 삭제 기능은 토큰 인증이 필요합니다. 우측 상단의 [GUEST 🔒] 배지를 클릭해 먼저 인증해 주세요.");
          return;
        }

        const index = parseInt(this.getAttribute('data-index'), 10);
        if (confirm('이 프로젝트를 삭제하고 Gist 클라우드에 반영하시겠습니까?')) {
          projectsCache.splice(index, 1);
          await saveProjectsToCloud(projectsCache);
        }
      });
    });
  }

  // ➕ 신규 프로젝트 등록 제어
  const formEl = document.getElementById('project-form');
  if (formEl) {
    formEl.addEventListener('submit', async function(e) {
      e.preventDefault();

      if (!isAuthorized()) {
        alert("🔒 프로젝트 추가는 토큰 인증이 필요합니다. 우측 상단의 [GUEST 🔒] 배지를 클릭해 먼저 인증해 주세요.");
        return;
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

  // 📦 JSON 백업 내보내기 버튼 (토큰 인증 필수)
  const exportBtn = document.getElementById('export-json-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      if (!isAuthorized()) {
        alert("🔒 백업 다운로드는 토큰 인증이 필요합니다. 우측 상단의 [GUEST 🔒] 배지를 클릭해 먼저 인증해 주세요.");
        return;
      }

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
