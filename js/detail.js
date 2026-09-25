// 🔑 GitHub Gist 설정값
const GIST_ID = "d584cff9f66dc32942cef6c3389befd2";
const GITHUB_TOKEN = "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"; // ghp_...

document.addEventListener('DOMContentLoaded', async () => {
  // 1. URL 쿼리 파라미터에서 project id 추출 (?id=proj-xxx)
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  if (!projectId) {
    alert('프로젝트 ID가 유효하지 않습니다.');
    window.location.href = 'index.html';
    return;
  }

  // 2. 화면 바인딩 함수
  function renderDetail(project) {
    document.getElementById('detail-headline').innerText = project.headline || project.title || 'Untitled';
    document.getElementById('detail-author').innerText = project.author || '';
    document.getElementById('detail-date').innerText = '📅 ' + (project.date || '');
    document.getElementById('detail-tag').innerText = project.badgeTag || 'PROJECT';
    
    const statusEl = document.getElementById('detail-status');
    statusEl.innerText = project.status || 'IN PROGRESS';
    
    // 상태에 따른 배지 색상 동적 처리
    const statusText = (project.status || '').trim().toUpperCase();
    if (statusText === 'COMPLETED') {
      statusEl.style.backgroundColor = '#2d6a4f';
    } else if (statusText === 'DROPPED') {
      statusEl.style.backgroundColor = '#6c757d';
    } else {
      statusEl.style.backgroundColor = '#c84b29';
    }

    const imgEl = document.getElementById('detail-image');
    if (project.image) {
      imgEl.src = project.image;
      imgEl.style.display = 'block';
    } else {
      imgEl.style.display = 'none';
    }

    document.getElementById('detail-summary').innerText = project.summary || '';
  }

  // 3. 로컬 스토리지 캐시 데이터에서 먼저 찾아 0.1초 만에 표시
  let projects = [];
  const saved = localStorage.getItem('gazette_projects');
  if (saved) {
    try {
      projects = JSON.parse(saved);
      const cachedProj = projects.find(p => p.id === projectId);
      if (cachedProj) {
        renderDetail(cachedProj);
      }
    } catch (e) {
      console.warn("Cache parse error:", e);
    }
  }

  // 4. 백그라운드에서 Gist 최신 데이터 동기화
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
        localStorage.setItem('gazette_projects', fileContent);
        projects = JSON.parse(fileContent);
        const latestProj = projects.find(p => p.id === projectId);
        
        if (latestProj) {
          renderDetail(latestProj);
        } else if (!saved) {
          alert('해당 프로젝트를 찾을 수 없습니다.');
          window.location.href = 'index.html';
        }
      }
    }
  } catch (err) {
    console.warn("Detail Gist sync failed (Using local cache):", err);
  }
});
