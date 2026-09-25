// 🔑 GIST_ID 설정
const GIST_ID = "d584cff9f66dc32942cef6c3389befd2";

document.addEventListener('DOMContentLoaded', () => {
  let allProjects = [];

  const projectsContainer = document.getElementById('projects-container');
  const tagFilter = document.getElementById('tag-filter');
  const statusFilter = document.getElementById('status-filter');
  const searchInput = document.getElementById('search-input');

  // 1. 태그 옵션 동적 생성 함수 (안전 모드)
  function populateTagOptions(projects) {
    if (!tagFilter) return;

    // 현재 사용자가 선택하고 있던 값 백업
    const currentValue = tagFilter.value || 'ALL';

    // 중복 제거용 집합
    const tagsSet = new Set();

    projects.forEach(p => {
      if (p.badgeTag && String(p.badgeTag).trim() !== '') {
        tagsSet.add(String(p.badgeTag).trim().toUpperCase());
      }
    });

    // 드롭다운 초기화
    tagFilter.innerHTML = '<option value="ALL">ALL TAGS</option>';

    // 태그 알파벳순 정렬 후 추가
    Array.from(tagsSet).sort().forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      tagFilter.appendChild(option);
    });

    // 이전에 선택했던 값이 새로 만든 옵션 목록에 있으면 복원
    if (Array.from(tagFilter.options).some(opt => opt.value === currentValue)) {
      tagFilter.value = currentValue;
    } else {
      tagFilter.value = 'ALL';
    }
  }

  // 2. 카드 렌더링 함수
  function renderProjects(projects) {
    if (!projectsContainer) return;
    projectsContainer.innerHTML = '';

    if (projects.length === 0) {
      projectsContainer.innerHTML = '<p class="form-help-text" style="padding: 30px 0; text-align: center; width: 100%;">조건에 맞는 프로젝트가 없습니다.</p>';
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

  // 3. 필터링 로직 (유연한 비교)
  function applyFilters() {
    const selectedTag = tagFilter ? tagFilter.value.toUpperCase() : 'ALL';
    const selectedStatus = statusFilter ? statusFilter.value.toUpperCase() : 'ALL';
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filtered = allProjects.filter(proj => {
      // 태그 필터
      const projTag = String(proj.badgeTag || '').trim().toUpperCase();
      const matchTag = (selectedTag === 'ALL') || (projTag === selectedTag);

      // 상태 필터
      const projStatus = String(proj.status || 'IN PROGRESS').trim().toUpperCase();
      const matchStatus = (selectedStatus === 'ALL') || (projStatus === selectedStatus);

      // 검색 필터
      const matchQuery = !query || 
        String(proj.title || '').toLowerCase().includes(query) ||
        String(proj.headline || '').toLowerCase().includes(query) ||
        String(proj.summary || '').toLowerCase().includes(query) ||
        String(proj.author || '').toLowerCase().includes(query);

      return matchTag && matchStatus && matchQuery;
    });

    renderProjects(filtered);
  }

  // 4. 데이터 로드
  function loadProjectsData() {
    // 1) 로컬 캐시 즉시 반영
    const saved = localStorage.getItem('gazette_projects');
    if (saved) {
      try {
        allProjects = JSON.parse(saved);
        populateTagOptions(allProjects);
        applyFilters();
      } catch (e) {
        console.warn("Cache parse error:", e);
      }
    }

    // 2) Gist 클라우드 동기화
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
          populateTagOptions(allProjects);
          applyFilters(); // 필터 재적용
        }
      })
      .catch(err => console.warn("Gist fetch failed:", err));
  }

  // 5. 이벤트 등록 ('change' 및 'input' 이벤트 모두 등록)
  if (tagFilter) tagFilter.addEventListener('change', applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
    searchInput.addEventListener('keyup', applyFilters);
  }

  loadProjectsData();
});
