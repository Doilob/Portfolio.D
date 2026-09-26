document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  const detailContainer = document.getElementById('project-detail-container');
  const navSection = document.getElementById('article-nav-section');
  const relatedGrid = document.getElementById('related-grid');

  function getGistId() {
    if (window.GazetteAuth && window.GazetteAuth.getGistId) {
      const id = window.GazetteAuth.getGistId();
      if (id && id !== "d584cff9f66dc32942cef6c3389befd2") return id;
    }
    return "d584cff9f66dc32942cef6c3389befd2";
  }

  // 📝 마크다운 -> HTML 변환 파서
  function parseMarkdown(text) {
    if (!text) return '';
    let html = text;
    html = html.replace(/^### (.*$)/gim, '<h3 style="font-family:\'Playfair Display\',serif; margin: 1rem 0 0.5rem;">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="font-family:\'Playfair Display\',serif; margin: 1.2rem 0 0.6rem;">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 style="font-family:\'Playfair Display\',serif; margin: 1.5rem 0 0.8rem;">$1</h1>');
    html = html.replace(/^> (.*$)/gim, '<blockquote style="border-left: 3px solid var(--accent-orange); padding-left: 12px; font-style: italic; margin: 1rem 0; color: var(--text-muted);">$1</blockquote>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" style="color: var(--accent-orange); font-weight: bold; text-decoration: underline;">$1</a>');
    html = html.replace(/^\- (.*$)/gim, '• $1<br>');
    return html.replace(/\n/g, '<br>');
  }

  // 상세 데이터 출력
  function renderDetail(projects, currentId) {
    if (!projects || projects.length === 0) return;

    const index = projects.findIndex(p => p.id === currentId);
    if (index === -1) {
      if (detailContainer) {
        detailContainer.innerHTML = '<p class="form-help-text" style="text-align: center; padding: 40px 0;">요청하신 기사를 찾을 수 없습니다.</p>';
      }
      return;
    }

    const proj = projects[index];
    let statusBg = '#c84b29';
    const statusText = String(proj.status || 'IN PROGRESS').trim().toUpperCase();
    if (statusText === 'COMPLETED') statusBg = '#2d6a4f';
    if (statusText === 'DROPPED') statusBg = '#6c757d';

    // 1. 메인 본문 렌더링
    if (detailContainer) {
      const imgHtml = proj.image 
        ? `<div class="detail-image-box"><img src="${proj.image}" alt="${proj.title}" class="detail-image"></div>`
        : '';

      detailContainer.innerHTML = `
        <header class="detail-header">
          <div class="detail-meta">
            <span class="badge badge-tag-default">${proj.badgeTag || 'PROJECT'}</span>
            <span class="badge" style="background: ${statusBg};">${statusText}</span>
            <span class="meta-date">${proj.date || ''}</span>
          </div>
          <h1 class="detail-headline">${proj.headline || proj.title}</h1>
          <p class="detail-author">${proj.author || 'by Anonymous'}</p>
        </header>
        ${imgHtml}
        <article class="detail-summary">
          ${parseMarkdown(proj.summary)}
        </article>
      `;
    }

    // 2. 이전글 / 다음글 동적 네비게이션
    if (navSection) {
      const prevProj = projects[index + 1]; // 이전 기사
      const nextProj = projects[index - 1]; // 다음 기사

      const prevHtml = prevProj 
        ? `<div class="nav-box"><a href="detail.html?id=${prevProj.id}"><span class="nav-label">&larr; PREVIOUS ARTICLE</span><div class="nav-title">${prevProj.title}</div></a></div>`
        : `<div class="nav-box" style="opacity:0.4;"><span class="nav-label">&larr; PREVIOUS ARTICLE</span><div class="nav-title">첫 번째 기사입니다</div></div>`;

      const nextHtml = nextProj
        ? `<div class="nav-box" style="text-align: right;"><a href="detail.html?id=${nextProj.id}"><span class="nav-label">NEXT ARTICLE &rarr;</span><div class="nav-title">${nextProj.title}</div></a></div>`
        : `<div class="nav-box" style="text-align: right; opacity:0.4;"><span class="nav-label">NEXT ARTICLE &rarr;</span><div class="nav-title">최신 기사입니다</div></div>`;

      navSection.innerHTML = `
        <div class="nav-section-title">CONTINUE READING</div>
        <div class="article-nav-grid">
          ${prevHtml}
          ${nextHtml}
        </div>
      `;
    }

    // 3. 연관 프로젝트 추천 (동일 태그 기준)
    if (relatedGrid) {
      const related = projects
        .filter(p => p.id !== currentId && p.badgeTag === proj.badgeTag)
        .slice(0, 2);

      if (related.length > 0) {
        relatedGrid.innerHTML = related.map(item => `
          <div class="related-card">
            ${item.image ? `<img src="${item.image}" alt="${item.title}">` : ''}
            <h4>${item.title}</h4>
            <a href="detail.html?id=${item.id}">READ ARTICLE &rarr;</a>
          </div>
        `).join('');
      } else {
        const relatedSection = document.getElementById('related-section');
        if (relatedSection) relatedSection.style.display = 'none';
      }
    }
  }

  // 데이터 로드
  function loadData() {
    const saved = localStorage.getItem('gazette_projects');
    if (saved) {
      try {
        const projects = JSON.parse(saved);
        renderDetail(projects, projectId);
      } catch (e) {}
    }

    const gistId = getGistId();
    if (!gistId || gistId === "d584cff9f66dc32942cef6c3389befd2") return;

    fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    })
      .then(res => res.ok ? res.json() : null)
      .then(gistData => {
        if (!gistData) return;
        const fileContent = gistData.files['projects.json']?.content;
        if (fileContent) {
          const projects = JSON.parse(fileContent);
          localStorage.setItem('gazette_projects', fileContent);
          renderDetail(projects, projectId);
        }
      })
      .catch(err => console.warn("Detail gist fetch failed:", err));
  }

  loadData();
});
