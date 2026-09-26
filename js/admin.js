document.addEventListener('DOMContentLoaded', () => {
  let projectsCache = [];
  let adminSaveConfirmState = false;

  const summaryInput = document.getElementById('p-summary');
  const previewDiv = document.getElementById('md-preview');
  const mdToolbar = document.getElementById('md-toolbar');
  const btnWrite = document.getElementById('btn-mode-write');
  const btnPreview = document.getElementById('btn-mode-preview');

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

  // 간단한 마크다운 -> HTML 변환 파서
  function parseMarkdown(text) {
    if (!text) return '';
    let html = text;
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank">$1</a>');
    html = html.replace(/^\- (.*$)/gim, '• $1<br>');
    return html.replace(/\n/g, '<br>');
  }

  // 1. 🔗 마크다운 툴바 및 팝업 링크 처리
  if (mdToolbar) {
    mdToolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || !summaryInput) return;

      const action = btn.getAttribute('data-md');
      const start = summaryInput.selectionStart;
      const end = summaryInput.selectionEnd;
      const selectedText = summaryInput.value.substring(start, end);
      let replacement = '';

      if (action === 'link') {
        const inputUrl = prompt("🔗 연결할 웹사이트 URL 주소를 입력하세요:", "https://");
        if (!inputUrl) return;
        replacement = `[${selectedText || '링크 텍스트'}](${inputUrl.trim()})`;
      } else {
        switch (action) {
          case 'bold': replacement = `**${selectedText || 'bold text'}**`; break;
          case 'italic': replacement = `*${selectedText || 'italic text'}*`; break;
          case 'h1': replacement = `\n# ${selectedText || 'Header 1'}\n`; break;
          case 'h2': replacement = `\n## ${selectedText || 'Header 2'}\n`; break;
          case 'quote': replacement = `\n> ${selectedText || 'Quote text'}\n`; break;
          case 'list': replacement = `\n- ${selectedText || 'List item'}\n`; break;
        }
      }

      summaryInput.setRangeText(replacement, start, end, 'select');
      summaryInput.focus();
    });
  }

  // 2. Write / Preview 탭 전환
  if (btnWrite && btnPreview) {
    btnWrite.addEventListener('click', () => {
      summaryInput.style.display = 'block';
      if (mdToolbar) mdToolbar.style.display = 'flex';
      previewDiv.style.display = 'none';
      btnWrite.classList.add('btn-tab-active');
      btnWrite.classList.remove('btn-tab-inactive');
      btnPreview.classList.add('btn-tab-inactive');
      btnPreview.classList.remove('btn-tab-active');
    });

    btnPreview.addEventListener('click', () => {
      previewDiv.innerHTML = parseMarkdown(summaryInput.value);
      summaryInput.style.display = 'none';
      if (mdToolbar) mdToolbar.style.display = 'none';
      previewDiv.style.display = 'block';
      btnPreview.classList.add('btn-tab-active');
      btnPreview.classList.remove('btn-tab-inactive');
      btnWrite.classList.add('btn-tab-inactive');
      btnWrite.classList.remove('btn-tab-active');
    });
  }

  // Gist 데이터 불러오기
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

  // Gist 클라우드 저장
  async function saveProjectsToCloud(projects) {
    if (!isAuthorized()) {
      alert("🛑 [경고] 인증되지 않은 상태에서는 저장, 수정, 삭제가 불가능합니다. 우측 상단의 [GUEST 🔒] 배지를 눌러 먼저 인증해 주세요.");
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

  // 목록 렌더링
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

    listEl.querySelectorAll('.edit-link').forEach(link => {
      link.addEventListener('click', function(e) {
        if (!isAuthorized()) {
          e.preventDefault();
          alert("🔒 수정 기능은 토큰 인증이 필요합니다. 우측 상단의 [GUEST 🔒] 배지를 눌러 먼저 인증해 주세요.");
        }
      });
    });

    listEl.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        if (!isAuthorized()) {
          alert("🔒 삭제 기능은 토큰 인증이 필요합니다. 우측 상단의 [GUEST 🔒] 배지를 눌러 먼저 인증해 주세요.");
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

  // 3. ➕ 신규 프로젝트 등록 (2단계 저장 및 중복 방지)
  const formEl = document.getElementById('project-form');
  if (formEl) {
    const submitBtn = formEl.querySelector('button[type="submit"]');

    formEl.addEventListener('submit', async function(e) {
      e.preventDefault();

      if (!isAuthorized()) {
        alert("🔒 프로젝트 추가는 토큰 인증이 필요합니다. 우측 상단의 [GUEST 🔒] 배지를 클릭해 먼저 인증해 주세요.");
        return;
      }

      // 1단계: 정말 저장할지 확인
      if (!adminSaveConfirmState) {
        adminSaveConfirmState = true;
        submitBtn.innerText = "❓ 정말 저장하시겠습니까?";
        submitBtn.style.background = "var(--accent-orange, #c84b29)";
        
        setTimeout(() => {
          if (adminSaveConfirmState && !submitBtn.disabled) {
            adminSaveConfirmState = false;
            submitBtn.innerText = "💾 Save Project";
            submitBtn.style.background = "var(--text-main)";
          }
        }, 5000);
        return;
      }

      // 2단계: 저장 진행 (버튼 비활성화)
      submitBtn.disabled = true;
      submitBtn.innerText = "⏳ 저장 중...";
      submitBtn.style.background = "var(--accent-gray, #6c757d)";

      try {
        const fileInput = document.getElementById('p-image-file');
        let base64Image = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';

        if (fileInput && fileInput.files.length > 0) {
          try {
            base64Image = await compressAndConvertToBase64(fileInput.files[0]);
          } catch (err) {
            alert('이미지 처리 중 오류가 발생했습니다.');
          }
        }

        const dateVal = document.getElementById('p-date') ? document.getElementById('p-date').value.trim() : '';

        const newProj = {
          id: 'proj-' + Date.now(),
          title: document.getElementById('p-title').value,
          status: document.getElementById('p-status').value,
          badgeTag: document.getElementById('p-tag').value || 'PROJECT',
          headline: document.getElementById('p-headline').value,
          author: document.getElementById('p-author').value || 'by Author',
          date: dateVal || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          image: base64Image,
          summary: summaryInput ? summaryInput.value : ''
        };

        projectsCache.unshift(newProj);
        await saveProjectsToCloud(projectsCache);
        
        this.reset();
        if (summaryInput) summaryInput.value = '';
        if (previewDiv) previewDiv.innerHTML = '';
      } catch (err) {
        alert("저장 도중 오류가 발생했습니다.");
      } finally {
        adminSaveConfirmState = false;
        submitBtn.disabled = false;
        submitBtn.innerText = "💾 Save Project";
        submitBtn.style.background = "var(--text-main)";
      }
    });
  }

  // JSON 백업 내보내기
  const exportBtn = document.getElementById('export-json-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      if (!isAuthorized()) {
        alert("🔒 백업 다운로드는 토큰 인증이 필요합니다. 우측 상단의 [GUEST 🔒] 배지를 눌러 먼저 인증해 주세요.");
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
