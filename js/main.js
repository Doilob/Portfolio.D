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

// 2. 기본 데이터 (projects.json 로드 실패 시 백업용)
const defaultProjects = [
  {
    id: "proj-1",
    title: "Project 1: Redesigning a Global Brand",
    status: "IN PROGRESS",
    headline: "Revolutionizing Visual Identity",
    author: "by Sarah Jenkins",
    date: "May, 2024 • Sep. 12, 2026",
    badgeTag: "BRANDING",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
  },
  {
    id: "proj-2",
    title: "Project 2: Digital Editorial Platform",
    status: "DROPPED",
    headline: "Curating Stories for the Modern Reader",
    author: "by Sarah Jenkins",
    date: "Jan. 13, 2024",
    badgeTag: "EDITORIAL",
    image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80",
    summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
  },
  {
    id: "proj-3",
    title: "Project 3: Interactive Web Experience",
    status: "COMPLETED",
    headline: "Engaging Users Through Immersive Design",
    author: "by Sarah Jenkins",
    date: "May, 2024 • Sat. 15, 2024",
    badgeTag: "WEB",
    image: "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?auto=format&fit=crop&w=800&q=80",
    summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
  }
];

// 3. 프로젝트 렌더링 함수 (CSS 클래스와 완벽 호환)
function renderProjects(projects) {
  const container = document.getElementById('projects-container');
  if (!container) return;
  container.innerHTML = '';

  projects.forEach(proj => {
    // 배지 태그 클래스 결정
    let badgeClass = 'badge-branding';
    if (proj.badgeTag === 'WEB') badgeClass = 'badge-web';
    if (proj.badgeTag === 'EDITORIAL') badgeClass = 'badge-editorial';
    if (proj.badgeTag === 'new') badgeClass = 'badge-branding';

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
              <span class="badge badge-featured">${proj.status || 'FEATURED'}</span>
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

// 4. 데이터 불러오기 (projects.json 우선, 없으면 localStorage 또는 기본값)
fetch('projects.json')
  .then(res => res.json())
  .then(data => renderProjects(data))
  .catch(() => {
    const saved = localStorage.getItem('gazette_projects');
    if (saved) {
      renderProjects(JSON.parse(saved));
    } else {
      renderProjects(defaultProjects);
    }
  });
