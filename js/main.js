// 🔑 GitHub Gist 설정값
const GIST_ID = "d584cff9f66dc32942cef6c3389befd2";
const GITHUB_TOKEN = "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"; // ghp_...

// 1. 헤더/푸터 날짜 동적 표시
function updateDate() {
  const now = new Date();
  const options = { year: 'numeric', month: 'short', day: '2-digit' };
  const formattedDate = now.toLocaleDateString('en-US', options).toUpperCase();
  
  const headerDate = document.getElementById('header-date');
  if (headerDate) headerDate.innerText = `TODAY: ${formattedDate}`;
  
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.innerText = now.getFullYear();
}
updateDate();

// 2. 플레이리스트 로테이션 (48시간 주기)
const samplePlaylist = [
  { title: "Lofi Beats for Focus", artist: "ChillHop" },
  { title: "Jazz Background Melodies", artist: "Blue Note Radio" },
  { title: "Acoustic Morning Vibes", artist: "Studio Session" },
  { title: "Classical Piano Concerto", artist: "Philharmonic" },
  { title: "Ambient Workspace Flow", artist: "Deep Focus" }
];

function loadRandomTrack() {
  const trackEl = document.getElementById('youtube-track-header');
  if (!trackEl) return;
  const twoDaySeed = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 48));
  const track = samplePlaylist[twoDaySeed % samplePlaylist.length];
  trackEl.innerHTML = `▶ ${track.title} - ${track.artist}`;
}
loadRandomTrack();

// 3. 전역 변수 및 기본 백업 데이터
let globalProjects = [];

const defaultProjects = [
  {
    id: "proj-1",
    title: "Project 1: Redesigning a Global Brand",
    status: "IN PROGRESS",
    headline: "Revolutionizing Visual Identity",
    author: "by Sarah Jenkins",
    date: "May 12, 2024",
    badgeTag: "BRANDING",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
  }
];

// 4. 프로젝트 렌더링 함수
function renderProjects(projects) {
  const container = document.getElementById('projects-container');
  if (!container) return;
  container.innerHTML = '';

  if (!projects || projects.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding:20px; font-style:italic;">No projects found in the archive.</p>';
    return;
  }

  projects.forEach(proj => {
    let badgeClass = 'badge-branding';
    if (proj.badgeTag === 'WEB') badgeClass = 'badge-web';
    if (proj.badgeTag === 'EDITORIAL') badgeClass = 'badge-editorial';
    if (proj.badgeTag === 'new') badgeClass = 'badge-branding';

    let statusBgColor = '#c84b29';
    const statusText = (proj.status || 'IN PROGRESS').trim().toUpperCase();
    if (statusText === 'COMPLETED') statusBgColor = '#2d6a4f';
    if (statusText === 'DROPPED') statusBgColor = '#6c757d';

    const articleHTML = `
      <article class="project-card">
        <div class="project-header-bar">
          <span class="project-num">${proj.title}</span>
          <span class="badge ${badgeClass}">${proj.badgeTag || 'PROJECT'}</span>
        </div>
        
        <div class="project-content">
          <div class="image-box">
            <img src="${proj.image}" alt="${proj.headline}" style="width:100%; height:180px; object-fit:cover; margin-bottom:0.8rem; border-radius:4px; filter:sepia(10%);">
            <div class="sub-tags">
              <span class="badge" style="background-color: ${statusBgColor} !important; color: #fff;">${proj.status || 'IN PROGRESS'}</span>
              <p class="date-info">📅 ${proj.date}</p>
            </div>
          </div>

          <div class="text-box">
            <h2>${proj.headline}</h2>
            <p class="author">${proj.author}</p>
            <p class="excerpt">${proj.summary}</p>
            <a href="detail.html?id=${proj.id}" class="read-more">Continue reading &rarr;</a>
          </div>
        </div>
      </article>
    `;
    container.insertAdjacentHTML('beforeend', articleHTML);
  });
}

// 5. 검색, 필터, 정렬 함수
function filterAndSortProjects() {
  const tagEl = document.getElementById('filter-tag');
  const keywordEl = document.getElementById('filter-keyword');
  const sortEl = document.getElementById('sort-order');

  const tagFilter = tagEl ? tagEl.value : "";
  const keywordFilter = keywordEl ? keywordEl.value.toLowerCase() : "";
  const sortOrder = sortEl ? sortEl.value : "latest";

  let filtered = globalProjects.filter(proj => {
    const matchesTag = tagFilter === "" || (proj.badgeTag && proj.badgeTag.toUpperCase() === tagFilter.toUpperCase());
    const matchesKeyword = (proj.author && proj.author.toLowerCase().includes(keywordFilter)) || 
                           (proj.headline && proj.headline.toLowerCase().includes(keywordFilter)) ||
                           (proj.title && proj.title.toLowerCase().includes(keywordFilter));
    return matchesTag && matchesKeyword;
  });

  filtered.sort((a, b) => {
    const dateA = new Date(a.date || 0);
    const dateB = new Date(b.date || 0);
    return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
  });

  renderProjects(filtered);
}

document.getElementById('filter-tag')?.addEventListener('change', filterAndSortProjects);
document.getElementById('filter-keyword')?.addEventListener('input', filterAndSortProjects);
document.getElementById('sort-order')?.addEventListener('change', filterAndSortProjects);

// 6. GitHub Gist API 데이터 불러오기
function initProjects() {
  fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  })
    .then(res => {
      if (!res.ok) throw new Error('Gist fetch failed');
      return res.json();
    })
    .then(gistData => {
      const fileContent = gistData.files['projects.json']?.content;
      globalProjects = fileContent ? JSON.parse(fileContent) : defaultProjects;
      filterAndSortProjects();
    })
    .catch((err) => {
      console.warn("Gist load failed, fallback to local storage:", err);
      const saved = localStorage.getItem('gazette_projects');
      globalProjects = saved ? JSON.parse(saved) : defaultProjects;
      filterAndSortProjects();
    });
}

initProjects();
