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
    summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
  }
];

function getStoredProjects() {
  const saved = localStorage.getItem('gazette_projects');
  return saved ? JSON.parse(saved) : defaultProjects;
}

function saveProjects(projects) {
  localStorage.setItem('gazette_projects', JSON.stringify(projects, null, 2));
  renderAdminList();
}

// 기존 renderAdminList 함수를 이 코드로 교체해 주세요.
function renderAdminList() {
  const projects = getStoredProjects();
  const listEl = document.getElementById('admin-projects-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (projects.length === 0) {
    listEl.innerHTML = '<p style="font-family: \'Source Serif 4\', Georgia, serif; font-style: italic; color: #666; font-size: 0.85rem; padding: 10px 0;">No projects registered in the archive.</p>';
    return;
  }

  projects.forEach((proj, idx) => {
    // 상태별 배지 색상 매칭
    let statusBg = '#c84b29'; // 기본 IN PROGRESS (주황빛)
    if (proj.status === 'COMPLETED') statusBg = '#2d6a4f'; // 완료 (초록빛)
    if (proj.status === 'DROPPED') statusBg = '#6c757d';   // 폐기 (회색)

    const item = document.createElement('div');
    item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid #d8d2c6;";
    
    item.innerHTML = `
      <div style="padding-right: 15px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <strong style="font-family: 'Playfair Display', serif; font-size: 1.05rem; color: #1a1a1a;">${proj.title}</strong>
          <span style="font-family: sans-serif; font-size: 0.6rem; padding: 0.15rem 0.5rem; background: ${statusBg}; color: #fff; border-radius: 10px; font-weight: 700; letter-spacing: 0.05rem;">${proj.status}</span>
        </div>
        <p style="font-family: 'Source Serif 4', Georgia, serif; font-size: 0.82rem; color: #444; margin: 0;">${proj.headline || ''}</p>
      </div>
      
      <div style="display: flex; gap: 6px; flex-shrink: 0;">
        <a href="edit.html?id=${proj.id}" style="padding: 6px 12px; background: #1a1a1a; color: #fff; text-decoration: none; font-family: sans-serif; font-size: 0.72rem; font-weight: bold; border-radius: 2px; transition: opacity 0.2s;">✏️ EDIT</a>
        <button onclick="deleteProject(${idx})" style="padding: 6px 12px; background: #c84b29; color: #fff; border: none; cursor: pointer; font-family: sans-serif; font-size: 0.72rem; font-weight: bold; border-radius: 2px;">🗑 DELETE</button>
      </div>
    `;
    listEl.appendChild(item);
  });
}
const formEl = document.getElementById('project-form');
if (formEl) {
  formEl.addEventListener('submit', function(e) {
    e.preventDefault();
    const projects = getStoredProjects();
    const newProj = {
      id: 'proj-' + Date.now(),
      title: document.getElementById('p-title').value,
      status: document.getElementById('p-status').value,
      badgeTag: document.getElementById('p-tag').value || 'PROJECT',
      headline: document.getElementById('p-headline').value,
      author: document.getElementById('p-author').value || 'by Author',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      image: document.getElementById('p-image').value || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      summary: document.getElementById('p-summary').value
    };

    projects.unshift(newProj);
    saveProjects(projects);
    this.reset();
    alert('프로젝트가 성공적으로 추가되었습니다!');
  });
}

window.deleteProject = function(index) {
  if (confirm('정말 이 프로젝트를 삭제하시겠습니까?')) {
    const projects = getStoredProjects();
    projects.splice(index, 1);
    saveProjects(projects);
  }
};

const exportBtn = document.getElementById('export-json-btn');
if (exportBtn) {
  exportBtn.addEventListener('click', function() {
    const projects = getStoredProjects();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projects, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "projects.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });
}

renderAdminList();
