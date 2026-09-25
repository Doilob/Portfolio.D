// 🔑 GitHub Gist 설정값
const GIST_ID = "d584cff9f66dc32942cef6c3389befd2";
const GITHUB_TOKEN = "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"; // ghp_...

document.addEventListener('DOMContentLoaded', () => {
  let projectsCache = [];

  // 1. Gist에서 최신 데이터 조회 (PULL)
  async function fetchCloudProjects() {
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
      } else {
        const saved = localStorage.getItem('gazette_projects');
        projectsCache = saved ? JSON.parse(saved) : [];
      }
    } catch (e) {
      console.error("Gist fetch error:", e);
      const saved = localStorage.getItem('gazette_projects');
      projectsCache = saved ? JSON.parse(saved) : [];
    }
    renderAdminList();
  }

  // 2. Gist로 데이터 실시간 푸시 (PUSH - PATCH)
  async function saveProjectsToCloud(projects) {
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
        alert('☁️ GitHub Gist 클라우드에 실시간 반영되었습니다!');
      } else {
        alert('⚠️ Gist 저장 실패 (로컬 스토리지에만 저장됨)');
      }
    } catch (e) {
      alert('네트워크 오류로 로컬에만 저장되었습니다.');
    }
    renderAdminList();
  }

  // 3. 관리자 목록 UI 렌더링
  function renderAdminList() {
    const listEl = document.getElementById('admin-projects-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (projectsCache.length === 0) {
      listEl.innerHTML = '<p style="font-family:\'Source Serif 4\', Georgia, serif; font-style:italic; color:#666; font-size:0.85rem; padding:10px 0;">No projects in archive.</p>';
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
            <span style="font-family: sans-serif; font-size: 0.6rem; padding: 0.15rem 0.5rem; background: ${statusBg}; color: #fff; border-radius: 10px; font-weight: 700;">${proj.status}</span>
          </div>
          <p style="font-family: 'Source Serif 4', Georgia, serif; font-size: 0.82rem; color: #444; margin: 0;">${proj.headline || ''}</p>
        </div>
        
        <div style="display: flex; gap: 6px; flex-shrink: 0;">
          <a href="edit.html?id=${proj.id}" style="padding: 6px 12px; background: #1a1a1a; color: #fff; text-decoration: none; font-family: sans-serif; font-size: 0.72rem; font-weight: bold; border-radius: 2px;">✏️ EDIT</a>
          <button type="button" class="delete-btn" data-index="${idx}" style="padding: 6px 12px; background: #c84b29; color: #fff; border: none; cursor: pointer; font-family: sans-serif; font-size: 0.72rem; font-weight: bold; border-radius: 2px;">🗑 DELETE</button>
        </div>
      `;
      listEl.appendChild(item);
    });

    // 삭제 버튼 이벤트
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

  // 4. 프로젝트 추가 폼 제출 처리
  const formEl = document.getElementById('project-form');
  if (formEl) {
    formEl.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const newProj = {
        id: 'proj-' + Date.now(),
        title: document.getElementById('p-title').value,
        status: document.getElementById('p-status').value,
        badgeTag: document.getElementById('p-tag').value || 'PROJECT',
        headline: document.getElementById('p-headline').value,
        author: document.getElementById('p-author').value || 'by Author',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        image: document.getElementById('p-image').value || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        summary: document.getElementById('p-summary').value
      };

      projectsCache.unshift(newProj);
      await saveProjectsToCloud(projectsCache);
      this.reset();
    });
  }

  // 5. 백업용 JSON 직접 다운로드 버튼
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
