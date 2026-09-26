document.addEventListener('DOMContentLoaded', () => {
  let allProjects = [];

  const projectsContainer = document.getElementById('projects-container');
  const tagFilter = document.getElementById('tag-filter');
  const statusFilter = document.getElementById('status-filter');
  const searchInput = document.getElementById('search-input');

  // Gist ID 가져오기 (auth-guard 전역 객체 우선 참조)
  function getGistId() {
    if (window.GazetteAuth && window.GazetteAuth.getGistId) {
      const id = window.GazetteAuth.getGistId();
      if (id && id !== "본인의_32자리_GIST_ID") return id;
    }
    return "본인의_32자리_GIST_ID"; // 백업 Gist ID
  }

  // 1. 📊 Daily / Total 방문자 카운터
  function trackVisitorStats() {
    const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const lastVisitDate = localStorage.getItem('gazette_last_visit_date');
    
    let dailyCount = parseInt(localStorage.getItem('gazette_daily_views') || '0', 10);
    let totalCount = parseInt(localStorage.getItem('gazette_total_views') || '0', 10);

    // 날짜 변경 시 오늘 카운트 초기화
    if (lastVisitDate !== todayStr) {
      dailyCount = 0;
      localStorage.setItem('gazette_last_visit_date', todayStr);
    }

    // 신규 세션 방문 시 +1
    if (!sessionStorage.getItem('gazette_counted_session')) {
      dailyCount += 1;
      totalCount += 1;
      
      localStorage.setItem('gazette_daily_views', dailyCount);
      localStorage.setItem('gazette_total_views', totalCount);
      sessionStorage.setItem('gazette_counted_session', 'true');
    }

    const dailyEl = document.getElementById('stat-daily');
    const totalEl = document.getElementById('stat-total');

    if (dailyEl) dailyEl.innerText = dailyCount.toLocaleString();
    if (totalEl) totalEl.innerText = totalCount.toLocaleString();
  }

  // 2. 태그 드롭다운 동적 생성
  function populateTagOptions(projects) {
    if (!tagFilter) return;

    const currentValue = tagFilter.value || 'ALL';
    const tagsSet = new Set();

    projects.forEach(p => {
      if (p.badgeTag && String(p.badgeTag).trim() !== '') {
        tagsSet.add(String(p.badgeTag).trim().toUpperCase());
      }
    });

    tagFilter.innerHTML = '<option value="ALL">ALL TAGS</option>';

    Array.from(tagsSet).sort().forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      tagFilter.appendChild(option);
    });

    if (Array.from(tagFilter.options).some(opt => opt.value === currentValue)) {
      tagFilter.value = currentValue;
    } else {
      tagFilter.value = 'ALL';
    }
  }

  // 3. 프로젝트 카드 목록 출력
  function renderProjects(projects) {
    if (!projectsContainer) return;
    projectsContainer.innerHTML = '';

    if (!projects || projects.length === 0) {
      projectsContainer.innerHTML = '<p class="form-help-text" style="padding: 30px 0; text-align: center; width: 100%;">등록된 프로젝트가 없거나 불러오는 중입니다.</p>';
      return;
    }

    projects.forEach(proj => {
      let statusBg = '#c84b29';
      const statusText = String(proj.status || 'IN PROGRESS').trim().toUpperCase();
      if (statusText === 'COMPLETED') statusBg = '#2d6a4f';
      if (statusText === 'DROPPED') statusBg = '#6c757d';

      const card = document.createElement('article');
      card.className = 'project-card';
      
      const imgHtml = proj.image 
        ? `<img src="${proj.image}" alt="${proj.title}">`
        : `<div class="placeholder-icon">📰</div>`;

      card.innerHTML = `
        <div class="project-header-bar">
          <div>
            <span class="badge badge-tag-default">${proj.badgeTag || 'PROJECT'}</span>
            <span class="badge" style="background: ${statusBg};">${statusText}</span>
          </div>
          <span class="date-info">${proj.date || ''}</span>
        </div>
        
        <div class="project-content">
          <div class="image-box">
            ${imgHtml}
          </div>
          <div class="text-box">
            <h2>${proj.headline || proj.title}</h2>
            <p class="author">${proj.author || 'by Anonymous'}</p>
            <p class="excerpt">${proj.summary || ''}</p>
            <a href="detail.html?id=${proj.id}" class="read-more">CONTINUE READING &rarr;</a>
          </div>
        </div>
      `;
      projectsContainer.appendChild(card);
    });
  }

  // 4. 필터링 로직
  function applyFilters() {
    const selectedTag = tagFilter ? tagFilter.value.toUpperCase() : 'ALL';
    const selectedStatus = statusFilter ? statusFilter.value.toUpperCase() : 'ALL';
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filtered = allProjects.filter(proj => {
      const projTag = String(proj.badgeTag || '').trim().toUpperCase();
      const matchTag = (selectedTag === 'ALL') || (projTag === selectedTag);

      const projStatus = String(proj.status || 'IN PROGRESS').trim().toUpperCase();
      const matchStatus = (selectedStatus === 'ALL') || (projStatus === selectedStatus);

      const matchQuery = !query || 
        String(proj.title || '').toLowerCase().includes(query) ||
        String(proj.headline || '').toLowerCase().includes(query) ||
        String(proj.summary || '').toLowerCase().includes(query) ||
        String(proj.author || '').toLowerCase().includes(query);

      return matchTag && matchStatus && matchQuery;
    });

    renderProjects(filtered);
  }

  // 5. 프로젝트 데이터 가져오기 (안전 처리)
  function loadProjectsData() {
    // 1) 로컬 캐시 우선 출력
    const saved = localStorage.getItem('gazette_projects');
    if (saved) {
      try {
        allProjects = JSON.parse(saved);
        populateTagOptions(allProjects);
        applyFilters();
      } catch (e) {
        console.warn("Local storage parse error:", e);
      }
    }

    const gistId = getGistId();
    if (!gistId || gistId === "본인의_32자리_GIST_ID") {
      console.warn("Gist ID가 바르게 설정되지 않았습니다.");
      return;
    }

    // 2) Gist 클라우드 읽기 (토큰 없이 공개 GET 가능)
    fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    })
      .then(res => res.ok ? res.json() : null)
      .then(gistData => {
        if (!gistData) return;
        const fileContent = gistData.files['projects.json']?.content;
        if (fileContent) {
          allProjects = JSON.parse(fileContent);
          localStorage.setItem('gazette_projects', fileContent);
          populateTagOptions(allProjects);
          applyFilters();
        }
      })
      .catch(err => console.warn("Gist fetch failed:", err));
  }

  // 이벤트 연결
  if (tagFilter) tagFilter.addEventListener('change', applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
    searchInput.addEventListener('keyup', applyFilters);
  }

  // 실행
  trackVisitorStats();
  loadProjectsData();
});
