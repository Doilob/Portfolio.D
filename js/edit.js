// 🔑 GIST_ID 설정
const GIST_ID = "d584cff9f66dc32942cef6c3389befd2";
let GITHUB_TOKEN = sessionStorage.getItem('gazette_temp_token') || "";

document.addEventListener('DOMContentLoaded', async () => {
  // 1. 페이지 진입 즉시 토큰 인증 확인
  function checkAndPromptAuth() {
    if (GITHUB_TOKEN && GITHUB_TOKEN.trim().startsWith('ghp_')) {
      return true;
    }

    const inputToken = prompt(
      "🔒 프로젝트를 수정하려면 GitHub Personal Access Token (ghp_...) 인증이 필요합니다.\n토큰을 입력해 주세요:"
    );

    if (inputToken !== null) {
      const trimmed = inputToken.trim();
      if (trimmed && trimmed.startsWith('ghp_')) {
        GITHUB_TOKEN = trimmed;
        sessionStorage.setItem('gazette_temp_token', trimmed);
        alert("🔓 인증 성공! 수정 모드가 활성화되었습니다.");
        return true;
      } else {
        alert("❌ 올바른 GitHub 토큰(ghp_...)이 아닙니다.");
      }
    }

    alert("⚠️ 인증되지 않아 관리자 페이지로 돌아갑니다.");
    window.location.href = 'admin.html';
    return false;
  }

  // 인증 검증 실행 (실패 시 즉시 admin.html 이동)
  if (!checkAndPromptAuth()) return;

  // 2. URL 파라미터에서 ID 추출
  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get('id');

  if (!targetId) {
    alert("올바르지 않은 접근입니다.");
    window.location.href = 'admin.html';
    return;
  }

  let projectsCache = [];

  // 3. 이미지 압축 헬퍼 함수
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

  // 4. 기존 프로젝트 데이터 로드 및 폼에 바인딩
  async function loadProjectData() {
    const saved = localStorage.getItem('gazette_projects');
    if (saved) {
      try {
        projectsCache = JSON.parse(saved);
      } catch (e) {
        console.warn("Local cache parse error:", e);
      }
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
        if (fileContent) {
          projectsCache = JSON.parse(fileContent);
          localStorage.setItem('gazette_projects', JSON.stringify(projectsCache, null, 2));
        }
      }
    } catch (e) {
      console.warn("Gist fetch failed, using local cache:", e);
    }

    // 폼 요소에 기존 데이터 채우기
    const currentProj = projectsCache.find(p => p.id === targetId);
    if (currentProj) {
      document.getElementById('p-id').value = currentProj.id;
      document.getElementById('p-title').value = currentProj.title || '';
      document.getElementById('p-status').value = currentProj.status || 'IN PROGRESS';
      document.getElementById('p-tag').value = currentProj.badgeTag || '';
      document.getElementById('p-headline').value = currentProj.headline || '';
      document.getElementById('p-author').value = currentProj.author || '';
      document.getElementById('p-summary').value = currentProj.summary || '';

      const previewImg = document.getElementById('current-image-preview');
      if (previewImg && currentProj.image) {
        previewImg.src = currentProj.image;
        previewImg.style.display = 'block';
      }
    } else {
      alert("해당 프로젝트를 찾을 수 없습니다.");
      window.location.href = 'admin.html';
    }
  }

  await loadProjectData();

  // 5. 수정 폼 제출 및 Gist 업데이트 처리
  const editForm = document.getElementById('edit-project-form');
  if (editForm) {
    editForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      if (!checkAndPromptAuth()) return; // 저장 시 2차 인증 검증

      const id = document.getElementById('p-id').value;
      const idx = projectsCache.findIndex(p => p.id === id);

      if (idx === -1) {
        alert("수정할 프로젝트를 찾지 못했습니다.");
        return;
      }

      // 새 파일 업로드 처리
      const fileInput = document.getElementById('p-image-file');
      let base64Image = projectsCache[idx].image; // 기존 이미지 유지

      if (fileInput && fileInput.files.length > 0) {
        try {
          base64Image = await compressAndConvertToBase64(fileInput.files[0]);
        } catch (err) {
          alert("이미지 처리 실패. 기존 이미지를 유지합니다.");
        }
      }

      // 데이터 갱신
      projectsCache[idx].title = document.getElementById('p-title').value;
      projectsCache[idx].status = document.getElementById('p-status').value;
      projectsCache[idx].badgeTag = document.getElementById('p-tag').value;
      projectsCache[idx].headline = document.getElementById('p-headline').value;
      projectsCache[idx].author = document.getElementById('p-author').value;
      projectsCache[idx].summary = document.getElementById('p-summary').value;
      projectsCache[idx].image = base64Image;

      // 로컬 스토리지 선반영
      localStorage.setItem('gazette_projects', JSON.stringify(projectsCache, null, 2));

      // Gist 클라우드 반영 (PATCH)
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
          alert("☁️ 프로젝트가 성공적으로 수정 및 동기화되었습니다!");
          window.location.href = 'admin.html';
        } else {
          alert("⚠️ Gist 클라우드 저장 실패. 토큰 권한을 확인해 주세요.");
        }
      } catch (err) {
        alert("네트워크 오류로 로컬 저장소에만 반영되었습니다.");
        window.location.href = 'admin.html';
      }
    });
  }
});
