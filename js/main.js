// 🔑 GIST_ID 설정 (공개 읽기는 토큰 없이도 가능)
const GIST_ID = "d584cff9f66dc32942cef6c3389befd2";

document.addEventListener('DOMContentLoaded', () => {
  let allProjects = [];

  const projectsContainer = document.getElementById('projects-container');
  const tagFilter = document.getElementById('tag-filter');
  const statusFilter = document.getElementById('status-filter');
  const searchInput = document.getElementById('search-input');

  // 1. 등록된 모든 프로젝트에서 태그 목록을 추출해 선택 상자(<select>)에 동적 반영
  function populateTagOptions(projects) {
    if (!tagFilter) return;

    // 현재 선택된 값 보존
    const currentValue = tagFilter.value;

    // 프로젝트 목록에서 유효한 badgeTag들만 추출 후 중복 제거 (Set)
    const tagsSet = new Set();
    projects.forEach(p => {
      if (p.badgeTag && p.badgeTag.trim() !== '') {
        tagsSet.add(p.badgeTag.trim().toUpperCase());
      }
    });

    // 기본 "ALL TAGS" 옵션으로 초기화
    tagFilter.innerHTML = '<option value="ALL">ALL TAGS</option>';

    // 추출된 태그들을 알파벳 순으로 정렬하여 <option> 생성
    Array.from(tagsSet).sort().forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      tagFilter.appendChild(option);
    });

    // 기존 선택값 유지 (존재할 경우)
    if (Array.from(tagFilter.options).some(opt => opt.value === currentValue)) {
      tagFilter.value = currentValue;
    }
  }

  // 2. 메인 페이지 프로젝트 카드 목록 렌더링
  function renderProjects(projects) {
    if (!projectsContainer) return;
    projectsContainer.innerHTML = '';

    if (projects.length === 0) {
      projectsContainer.innerHTML = '<p class="form-help-text" style="padding: 20px 0; text-align: center;">조건에 맞는 프로젝트가 없습니다.</p>';
      return;
    }

    projects.forEach(proj => {
      let statusBg = '#c84b29';
      const statusText = (proj.status || 'IN PROGRESS').trim().toUpperCase();
      if (statusText === 'COMPLETED') statusBg = '#2d6a4f';
      if (statusText === 'DROPPED') statusBg = '#6c757d';

      const card = document.createElement('article');
      card.className = 'project-card';
      
      const imgHtml = proj.image 
        ? `<img src="${proj.image}" alt="${proj.title}" style="width:100%; height:180px; object-fit:cover; filter:sepia(10%); margin-bottom:0.8rem;">`
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

  // 3. 필터링 및 검색 적용
  function applyFilters() {
    const selectedTag = tagFilter ? tagFilter.value : 'ALL';
    const selectedStatus = statusFilter ? statusFilter.value : 'ALL';
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filtered = allProjects.filter(proj => {
      // 태그 필터링
      const matchTag = (selectedTag === 'ALL') || 
                       (proj.badgeTag && proj.badgeTag.trim().toUpperCase() === selectedTag);

      // 상태 필터링
      const projStatus = (proj.status || 'IN PROGRESS').trim().toUpperCase();
      const matchStatus = (selectedStatus === 'ALL') || (projStatus === selectedStatus);

      // 검색어 필터링 (제목, 한줄요약, 본문, 저자 대상)
      const matchQuery = !query || 
        (proj.title && proj.title.toLowerCase().includes(query)) ||
        (proj.headline && proj.headline.toLowerCase().includes(query)) ||
        (proj.summary && proj.summary.toLowerCase().includes(query)) ||
        (proj.author && proj.author.toLowerCase().includes(query));

      return matchTag && matchStatus && matchQuery;
    });

    renderProjects(filtered);
  }

  // 4. 데이터 로드 (로컬 캐시 즉시 표시 ➔ Gist 백그라운드 동기화)
  function loadProjectsData() {
    // 1) 로컬 스토리지 데이터 먼저 렌더링
    const saved = localStorage.getItem('gazette_projects');
    if (saved) {
      try {
        allProjects = JSON.parse(saved);
        populateTagOptions(allProjects);
        renderProjects(allProjects);
      } catch (e) {
        console.warn("Local storage parse error:", e);
      }
    }

    // 2) Gist 클라우드에서 최신 데이터 가져오기
    fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    })
      .then(res => res.ok ? res.json() : null)
      .then(gistData => {
        if (!gistData) return;
        const fileContent = gistData.files['projects.json']?.content;
        if (fileContent) {
          allProjects = JSON.parse(fileContent);
          localStorage.setItem('gazette_projects', fileContent);
          populateTagOptions(allProjects); // 새 태그 포함하여 드롭다운 다시 생성
          applyFilters(); // 필터 재적용
        }
      })
      .catch(err => console.warn("Background Gist fetch failed:", err));
  }

  // 5. 이벤트 리스너 연결
  if (tagFilter) tagFilter.addEventListener('change', applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);
  if (searchInput) searchInput.addEventListener('input', applyFilters);

  loadProjectsData();
});
