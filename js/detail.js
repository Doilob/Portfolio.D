// 🔑 GIST_ID 설정
const GIST_ID = "d584cff9f66dc32942cef6c3389befd2";
let GITHUB_TOKEN = sessionStorage.getItem('gazette_temp_token') || "";

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  if (!projectId) {
    alert('유효하지 않은 프로젝트 접근입니다.');
    window.location.href = 'index.html';
    return;
  }

  let globalProjects = [];

  // 1. 현재 아티클 바인딩
  function renderCurrentArticle(project) {
    document.getElementById('detail-headline').innerText = project.headline || project.title || 'Untitled';
    document.getElementById('detail-author').innerText = project.author || 'by Anonymous';
    document.getElementById('detail-date').innerText = '📅 ' + (project.date || '');
    document.getElementById('detail-tag').innerText = project.badgeTag || 'PROJECT';
    
    const statusEl = document.getElementById('detail-status');
    const statusText = (project.status || 'IN PROGRESS').trim().toUpperCase();
    statusEl.innerText = statusText;
    
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

  // 2. 이전글 / 다음글 동적 바인딩
  function renderArticleNavigation(currentIndex) {
    const prevBox = document.getElementById('prev-article-box');
    const nextBox = document.getElementById('next-article-box');

    // 이전 글 (배열 상 다음 인덱스)
    const prevProj = globalProjects[currentIndex + 1];
    if (prevProj) {
      prevBox.innerHTML = `
        <a href="detail.html?id=${prevProj.id}">
          <span class="nav-label">&larr; PREVIOUS ARTICLE</span>
          <div class="nav-title">${prevProj.headline || prevProj.title}</div>
        </a>
      `;
    } else {
      prevBox.innerHTML = `
        <span class="nav-label" style="color:#999;">&larr; FIRST ARTICLE</span>
        <div class="nav-title" style="color:#999;">이전 기사가 없습니다</div>
      `;
    }

    // 다음 글 (배열 상 이전 인덱스)
    const nextProj = globalProjects[currentIndex - 1];
    if (nextProj) {
      nextBox.innerHTML = `
        <a href="detail.html?id=${nextProj.id}">
          <span class="nav-label" style="text-align:right;">NEXT ARTICLE &rarr;</span>
          <div class="nav-title" style="text-align:right;">${nextProj.headline || nextProj.title}</div>
        </a>
      `;
    } else {
      nextBox.innerHTML = `
        <span class="nav-label" style="color:#999; text-align:right;">LATEST ARTICLE &rarr;</span>
        <div class="nav-title" style="color:#999; text-align:right;">다음 기사가 없습니다</div>
      `;
    }
  }

  // 3. 연관 프로젝트 추천 바인딩
  function renderRelatedProjects(currentProj, currentIndex) {
    const grid = document.getElementById('related-projects-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const others = globalProjects.filter((_, idx) => idx !== currentIndex);
    let related = others.filter(p => p.badgeTag === currentProj.badgeTag);
    
    if (related.length < 2) {
      const remaining = others.filter(p => !related.includes(p));
      related = related.concat(remaining);
    }
    related = related.slice(0, 2);

    if (related.length === 0) {
      grid.innerHTML = '<p class="form-help-text">연관 기사가 없습니다.</p>';
      return;
    }

    related.forEach(proj => {
      const card = document.createElement('div');
      card.className = 'related-card';
      card.innerHTML = `
        <img src="${proj.image}" alt="${proj.headline || proj.title}" loading="lazy">
        <h4>${proj.headline || proj.title}</h4>
        <a href="detail.html?id=${proj.id}">Read Article &rarr;</a>
      `;
      grid.appendChild(card);
    });
  }

  // 4. 데이터 로드 (로컬 캐시 즉시 표시 ➔ Gist 백그라운드 동기화)
  function loadArticleData() {
    const saved = localStorage.getItem('gazette_projects');
    if (saved) {
      try {
        globalProjects = JSON.parse(saved);
        const idx = globalProjects.findIndex(p => p.id === projectId);
        if (idx !== -1) {
          renderCurrentArticle(globalProjects[idx]);
          renderArticleNavigation(idx);
          renderRelatedProjects(globalProjects[idx], idx);
        }
      } catch (e) {
        console.warn("Cache parse error:", e);
      }
    }

    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (GITHUB_TOKEN) headers['Authorization'] = `token ${GITHUB_TOKEN}`;

    fetch(`https://api.github.com/gists/${GIST_ID}`, { headers })
      .then(res => res.ok ? res.json() : null)
      .then(gistData => {
        if (!gistData) return;
        const fileContent = gistData.files['projects.json']?.content;
        if (fileContent) {
          localStorage.setItem('gazette_projects', fileContent);
          globalProjects = JSON.parse(fileContent);
          const idx = globalProjects.findIndex(p => p.id === projectId);
          if (idx !== -1) {
            renderCurrentArticle(globalProjects[idx]);
            renderArticleNavigation(idx);
            renderRelatedProjects(globalProjects[idx], idx);
          }
        }
      })
      .catch(err => console.warn("Background Gist sync skipped/failed:", err));
  }

  loadArticleData();
});
