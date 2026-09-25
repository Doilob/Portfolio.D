// 1. 날짜 동적 표시
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

// 2. 유튜브 추천 플레이리스트 (48시간 주기 갱신)
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

// 3. 전역 데이터 및 백업 데이터
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
    container.innerHTML = '<p style="text-align:center; padding:20px; font-style:italic; font-family:Georgia, serif;">No projects found in the archive.</p>';
    return;
  }

  projects.forEach(proj => {
    let badgeClass = 'badge-branding';
    if (proj.badgeTag === 'WEB') badgeClass = 'badge-web';
    if (proj.badgeTag === 'EDITORIAL') badgeClass = 'badge-editorial';
    if (proj.badgeTag === 'new') badgeClass = 'badge-branding';

    // 상태별 라운드 배지 색상 동적 설정
    let statusBgColor = '#c84b29'; // 기본 IN PROGRESS (주황빛)
    const statusText = (proj.status || 'IN PROGRESS').trim().toUpperCase();
    
    if (statusText === 'COMPLETED') {
      statusBgColor = '#2d6a4f';   // COMPLETED (초록빛)
    } else if (statusText === 'DROPPED') {
      statusBgColor = '#6c757d';   // DROPPED (회색빛)
    }

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

// 5. 필터 및 정렬 로직
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
    if (sortOrder === 'latest') {
      return dateB - dateA;
    } else {
      return dateA - dateB;
    }
  });

  renderProjects(filtered);
}

// 6. 이벤트 리스너 연결
document.getElementById('filter-tag')?.addEventListener('change', filterAndSortProjects);
document.getElementById('filter-keyword')?.addEventListener('input', filterAndSortProjects);
document.getElementById('sort-order')?.addEventListener('change', filterAndSortProjects);

// 7. 데이터 로드 초기화 (JSON 실패 시 localStorage 또는 기본값 안전 로드)
function initProjects() {
  fetch('projects.json')
    .then(res => {
      if (!res.ok) throw new Error('Network response failed');
      return res.json();
    })
    .then(data => {
      globalProjects = data;
      filterAndSortProjects();
    })
    .catch(() => {
      const saved = localStorage.getItem('gazette_projects');
      if (saved) {
        try {
          globalProjects = JSON.parse(saved);
        } catch (e) {
          globalProjects = defaultProjects;
        }
      } else {
        globalProjects = defaultProjects;
      }
      filterAndSortProjects();
    });
}

// 실행
initProjects();
