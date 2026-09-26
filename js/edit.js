document.addEventListener('DOMContentLoaded', () => {
  // URL에서 id 파라미터 추출 (?id=proj-12345)
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  let projectsCache = [];
  let currentProjectIndex = -1;

  const summaryInput = document.getElementById('p-summary');
  const previewDiv = document.getElementById('md-preview');
  const mdToolbar = document.getElementById('md-toolbar');
  const btnWrite = document.getElementById('btn-mode-write');
  const btnPreview = document.getElementById('btn-mode-preview');

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

  // 1. 마크다운 툴바 버튼 클릭 이벤트
  if (mdToolbar) {
    mdToolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || !summaryInput) return;

      const action = btn.getAttribute('data-md');
      const start = summaryInput.selectionStart;
      const end = summaryInput.selectionEnd;
      const selectedText = summaryInput.value.substring(start, end);
      let replacement = '';

      switch (action) {
        case 'bold': replacement = `**${selectedText || 'bold text'}**`; break;
        case 'italic': replacement = `*${selectedText || 'italic text'}*`; break;
        case 'h1': replacement = `\n# ${selectedText || 'Header 1'}\n`; break;
        case 'h2': replacement = `\n## ${selectedText || 'Header 2'}\n`; break;
        case 'quote': replacement = `\n> ${selectedText || 'Quote text'}\n`; break;
        case 'list': replacement = `\n- ${selectedText || 'List item'}\n`; break;
        case 'link': replacement = `[${selectedText || 'Link text'}](https://example.com)`; break;
      }

      summaryInput.setRangeText(replacement, start, end, 'select');
      summaryInput.focus();
    });
  }

  // 2. 탭 전환 (Write / Live Preview)
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

  // 3. 이미지 파일 Base64 압축 변환 헬퍼
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

  // 4. 기존 프로젝트 데이터 로드 및 폼 자동 작성 (Pre-fill)
  async function loadProjectData() {
    const saved = localStorage.getItem('gazette_projects');
    if (saved) {
      try {
        projectsCache = JSON.parse(saved);
      } catch (e) {
        console.error("Local storage parse error:", e);
      }
    }

    if (isAuthorized()) {
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
          if (fileContent) {
            projectsCache = JSON.parse(fileContent);
            localStorage.setItem('gazette_projects', fileContent);
          }
        }
      } catch (e) {
        console.warn("Gist fetch failed in edit page:", e);
      }
    }

    currentProjectIndex = projectsCache.findIndex(p => p.id === projectId);

    if (currentProjectIndex === -1) {
      alert("⚠️ 해당 프로젝트를 찾을 수 없습니다.");
      window.location.href = "admin.html";
      return;
    }

    const target = projectsCache[currentProjectIndex];

    if (document.getElementById('p-title')) document.getElementById('p-title').value = target.title || '';
    if (document.getElementById('p-status')) document.getElementById('p-status').value = target.status || 'IN PROGRESS';
    if (document.getElementById('p-tag')) document.getElementById('p-tag').value = target.badgeTag || '';
    if (document.getElementById('p-author')) document.getElementById('p-author').value = target.author || '';
    if (document.getElementById('p-date')) document.getElementById('p-date').value = target.date || '';
    if (document.getElementById('p-headline')) document.getElementById('p-headline').value = target.headline || '';
    if (summaryInput) summaryInput.value = target.summary || '';

    const previewImg = document.getElementById('preview-image');
    if (previewImg && target.image) {
      previewImg.src = target.image;
      previewImg.style.display = 'block';
    }
  }

  // 5. 수정 사항 저장 이벤트 처리
  const formEl = document.getElementById('edit-project-form');
  if (formEl) {
    formEl.addEventListener('submit', async function(e) {
      e.preventDefault();

      if (!isAuthorized()) {
        alert("🛑 미인증 상태에서는 수정을 저장할 수 없습니다. 우측 상단의 [GUEST 🔒] 배지를 눌러 먼저 인증해 주세요.");
        return;
      }

      if (currentProjectIndex === -1) return;

      const fileInput = document.getElementById('p-image-file');
      let base64Image = projectsCache[currentProjectIndex].image;

      if (fileInput && fileInput.files.length > 0) {
        try {
          base64Image = await compressAndConvertToBase64(fileInput.files[0]);
        } catch (err) {
          alert('이미지 처리 중 오류가 발생했습니다.');
        }
      }

      projectsCache[currentProjectIndex] = {
        ...projectsCache[currentProjectIndex],
        title: document.getElementById('p-title').value,
        status: document.getElementById('p-status').value,
        badgeTag: document.getElementById('p-tag').value || 'PROJECT',
        author: document.getElementById('p-author').value,
        date: document.getElementById('p-date').value,
        headline: document.getElementById('p-headline').value,
        image: base64Image,
        summary: summaryInput.value
      };

      localStorage.setItem('gazette_projects', JSON.stringify(projectsCache, null, 2));

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
                content: JSON.stringify(projectsCache, null, 2)
              }
            }
          })
        });

        if (res.ok) {
          alert('✏️ 프로젝트가 성공적으로 수정되었습니다!');
          window.location.href = "admin.html";
        } else {
          alert('⚠️ Gist 수정 저장 실패: 토큰 권한을 확인해 주세요.');
        }
      } catch (err) {
        alert('네트워크 오류가 발생했습니다.');
      }
    });
  }

  loadProjectData();
});
