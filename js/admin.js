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

function renderAdminList() {
  const projects = getStoredProjects();
  const listEl = document.getElementById('admin-projects-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  projects.forEach((proj, idx) => {
    const item = document.createElement('div');
    item.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #ddd;";
    item.innerHTML = `
    <div>
      <strong>${proj.title}</strong> <span style="font-size:0.75rem; color:#c84b29; font-weight:bold;">[${proj.status}]</span>
      <p style="font-size:0.8rem; color:#666;">${proj.headline}</p>
    </div>
    <div style="display:flex; gap:6px;">
      <a href="edit.html?id=${proj.id}" style="background:#1a1a1a; color:white; text-decoration:none; padding:5px 10px; font-size:0.75rem; border-radius:4px; display:inline-block; line-height:normal;">✏️ Edit</a>
      <button onclick="deleteProject(${idx})" style="background:#c84b29; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px; font-size:0.75rem;">🗑 Delete</button>
    </div>
  `;
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
