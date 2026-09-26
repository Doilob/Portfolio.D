document.addEventListener('DOMContentLoaded', () => {
  // URL에서 id 파라미터 추출 (?id=proj-12345)
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  let projectsCache = [];
  let currentProjectIndex = -1;

  function isAuthorized() {
    return window.GazetteAuth && window.GazetteAuth.isAuthorized();
  }

  function getGistId() {
    return window.GazetteAuth ? window.GazetteAuth.getGistId() : "";
  }

  function getToken() {
    return window.GazetteAuth ? window.GazetteAuth.getToken() : "";
  }

  // 1. 프로젝트 데이터 가져온 후 수정 폼에 기존 값 채우기
  async function loadProjectData() {
    const saved = localStorage.getItem('gazette_projects');
    if (saved) {
      try {
        projectsCache = JSON.parse(saved);
      } catch (e) {
        console.error("Local storage parse error:", e);
      }
    }

    // Gist에서 최신 데이터가 있으면 동기화
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

    // ID에 해당하는 프로젝트 찾기
    currentProjectIndex = projectsCache.findIndex(p => p.id === projectId);

    if (currentProjectIndex === -1) {
      alert("⚠️ 해당 프로젝트를 찾을 수 없습니다.");
      window.location.href = "admin.html";
      return;
    }

    // 📝 기존 글 데이터를 폼에 자동으로 채워넣기 (Pre-fill)
    const target = projectsCache[currentProjectIndex];
    
    if (document.getElementById('p-title')) document.getElementById('p-title').value = target.title || '';
    if (document.getElementById('p-status')) document.getElementById('p-status').value = target.status || 'IN PROGRESS';
    if (document.getElementById('p-tag')) document.getElementById('p-tag').value = target.badgeTag || '';
    if (document.getElementById('p-headline')) document.getElementById('p-headline').value = target.headline || '';
    if (document.getElementById('p-author')) document.getElementById('p-author').value = target.author || '';
    if (document.getElementById('p-summary')) document.getElementById('p-summary').value = target.summary || '';

    // 기존 미리보기 이미지 표시
    const previewImg = document.getElementById('preview-image');
    if (previewImg && target.image) {
      previewImg.src = target.image;
      previewImg.style.display = 'block';
    }
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

  // 2. 수정 완료 버튼 저장 처리
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
      let base64Image = projectsCache[currentProjectIndex].image; // 기존 이미지 유지

      if (fileInput && fileInput.files.length > 0) {
        try {
          base64Image = await compressAndConvertToBase64(fileInput.files[0]);
        } catch (err) {
          alert('이미지 처리 중 오류가 발생했습니다.');
        }
      }

      // 수정 데이터 반영
      projectsCache[currentProjectIndex] = {
        ...projectsCache[currentProjectIndex],
        title: document.getElementById('p-title').value,
        status: document.getElementById('p-status').value,
        badgeTag: document.getElementById('p-tag').value || 'PROJECT',
        headline: document.getElementById('p-headline').value,
        author: document.getElementById('p-author').value,
        image: base64Image,
        summary: document.getElementById('p-summary').value
      };

      // 로컬 스토리지 & Gist 클라우드 업데이트
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
