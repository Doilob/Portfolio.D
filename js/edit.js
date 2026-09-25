// 🔑 GitHub Gist 설정값
const GIST_ID = "d584cff9f66dc32942cef6c3389befd2";
const GITHUB_TOKEN = "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"; // ghp_...

document.addEventListener('DOMContentLoaded', async () => {
  // URL 쿼리 스트링에서 project id 추출 (?id=proj-123)
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  if (!projectId) {
    alert('프로젝트 ID가 유효하지 않습니다.');
    window.location.href = 'admin.html';
    return;
  }

  let projectsCache = [];
  let currentProject = null;

  // 이미지 파일 Base64 변환 + 자동 압축 (최대 800px)
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

  // 1. Gist 데이터 가져오기
  async function loadData() {
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
      const saved = localStorage.getItem('gazette_projects');
      projectsCache = saved ? JSON.parse(saved) : [];
    }

    currentProject = projectsCache.find(p => p.id === projectId);
    if (!currentProject) {
      alert('해당 프로젝트를 찾을 수 없습니다.');
      window.location.href = 'admin.html';
      return;
    }

    populateForm(currentProject);
  }

  // 2. 기존 데이터 폼에 채워넣기
  function populateForm(proj) {
    document.getElementById('p-title').value = proj.title || '';
    document.getElementById('p-status').value = proj.status || 'IN PROGRESS';
    document.getElementById('p-tag').value = proj.badgeTag || 'PROJECT';
    document.getElementById('p-headline').value = proj.headline || '';
    document.getElementById('p-author').value = proj.author || '';
    document.getElementById('p-summary').value = proj.summary || '';

    const previewImg = document.getElementById('current-image-preview');
    if (previewImg && proj.image) {
      previewImg.src = proj.image;
    }
  }

  // 3. 수정 사항 Gist에 저장 (PATCH)
  const formEl = document.getElementById('edit-project-form');
  if (formEl) {
    formEl.addEventListener('submit', async function(e) {
      e.preventDefault();

      const fileInput = document.getElementById('p-image-file');
      let base64Image = currentProject.image; // 기본값은 기존 이미지 유지

      // 새 파일 선택 시에만 압축 변환 적용
      if (fileInput && fileInput.files.length > 0) {
        try {
          base64Image = await compressAndConvertToBase64(fileInput.files[0]);
        } catch (err) {
          alert('이미지 처리 중 오류가 발생했습니다. 기존 이미지를 유지합니다.');
        }
      }

      // 데이터 업데이트
      const targetIndex = projectsCache.findIndex(p => p.id === projectId);
      if (targetIndex !== -1) {
        projectsCache[targetIndex] = {
          ...projectsCache[targetIndex],
          title: document.getElementById('p-title').value,
          status: document.getElementById('p-status').value,
          badgeTag: document.getElementById('p-tag').value,
          headline: document.getElementById('p-headline').value,
          author: document.getElementById('p-author').value,
          summary: document.getElementById('p-summary').value,
          image: base64Image
        };
      }

      // 로컬스토리지 백업 저장
      localStorage.setItem('gazette_projects', JSON.stringify(projectsCache, null, 2));

      // Gist 클라우드 저장
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
                content: JSON.stringify(projectsCache, null, 2)
              }
            }
          })
        });

        if (res.ok) {
          alert('☁️ 수정사항이 성공적으로 반영되었습니다!');
          window.location.href = 'admin.html';
        } else {
          alert('⚠️ Gist 저장 실패 (로컬 스토리지 백업에는 저장됨)');
        }
      } catch (err) {
        alert('네트워크 오류로 로컬 저장소에만 적용되었습니다.');
      }
    });
  }

  loadData();
});
