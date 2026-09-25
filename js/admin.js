const defaultProjects = [
{
id: "proj-1",
title: "Project 1: Redesigning a Global Brand",
status: "IN PROGRESS",
headline: "Revolutionizing Visual Identity",
author: "by Sarah Jenkins",
date: "May, 2024 • Sep. 12, 2026",
badgeTag: "BRANDING",
image: "project1.jpg",
summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
},
{
id: "proj-2",
title: "Project 2: Digital Editorial Platform",
status: "DROPPED",
headline: "Curating Stories for the Modern Reader",
author: "by Sarah Jenkins",
date: "Jan. 13, 2024",
badgeTag: "EDITORIAL",
image: "project2.jpg",
summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
},
{
id: "proj-3",
title: "Project 3: Interactive Web Experience",
status: "COMPLETED",
headline: "Engaging Users Through Immersive Design",
author: "by Sarah Jenkins",
date: "May, 2024 • Sat. 15, 2024",
badgeTag: "WEB",
image: "project3.jpg",
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
let statusBadgeClass = 'status-in-progress';
if (proj.status === 'COMPLETED') statusBadgeClass = 'status-completed';
if (proj.status === 'DROPPED') statusBadgeClass = 'status-dropped';

const item = document.createElement('div');
item.className = 'admin-project-item';
item.innerHTML = `
<div>
<strong>${proj.title}</strong>
<span class="status-badge ${statusBadgeClass}">${proj.status}</span>
<p class="item-sub">${proj.headline}</p>
</div>
<button class="btn-delete" onclick="deleteProject(${idx})">🗑 Delete</button>
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
image: document.getElementById('p-image').value || 'project.jpg',
summary: document.getElementById('p-summary').value
};

projects.unshift(newProj);
saveProjects(projects);
this.reset();
alert('Project saved successfully!');
});
}

window.deleteProject = function(index) {
if (confirm('Are you sure you want to delete this project?')) {
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

const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
resetBtn.addEventListener('click', function() {
if (confirm('Reset all projects to initial default list?')) {
saveProjects(defaultProjects);
}
});
}

renderAdminList();
