// 1. Dynamic Today's Date
function updateDate() {
const now = new Date();
const options = { year: 'numeric', month: 'short', day: '2-digit' };
const formattedDate = now.toLocaleDateString('en-US', options).toUpperCase();

const dateEl = document.getElementById('current-date');
if (dateEl) dateEl.innerText = `TODAY: ${formattedDate}`;

const yearEl = document.getElementById('footer-year');
if (yearEl) yearEl.innerText = now.getFullYear();
}
updateDate();

// 2. YouTube Random Track Dynamic Player
const samplePlaylist = [
{ title: "Lofi Beats for Focus", artist: "ChillHop" },
{ title: "Jazz Background Melodies", artist: "Blue Note Radio" },
{ title: "Acoustic Morning Vibes", artist: "Studio Session" },
{ title: "Classical Piano Concerto", artist: "Philharmonic" },
{ title: "Ambient Workspace Flow", artist: "Deep Focus" }
];

function loadRandomTrack() {
const trackEl = document.getElementById('youtube-track');
if (!trackEl) return;
const daySeed = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
const track = samplePlaylist[daySeed % samplePlaylist.length];
trackEl.innerHTML = `<span style="color:#e25b36;">▶</span> TODAY'S TRACK: <strong>${track.title}</strong> - ${track.artist}`;
}
loadRandomTrack();

// 3. Load Projects Data
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
image: "project2.jpg",
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
image: "project3.jpg",
summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
}
];

function renderProjects(projects) {
const container = document.getElementById('projects-container');
if (!container) return;
container.innerHTML = '';

projects.forEach(proj => {
let statusClass = 'status-in-progress';
if (proj.status === 'COMPLETED') statusClass = 'status-completed';
if (proj.status === 'DROPPED') statusClass = 'status-dropped';

const articleHTML = `
<article class="project-article">
<div class="project-header">
<h2 class="project-number">${proj.title}</h2>
<span class="status-badge ${statusClass}">${proj.status}</span>
</div>

<div class="project-grid">
<div class="project-media">
<img src="${proj.image}" alt="${proj.headline}" class="project-img">
<div class="media-meta">
<span class="badge-tag">${proj.badgeTag || 'FEATURED'}</span>
<span class="meta-date">📅 ${proj.date}</span>
</div>
</div>

<div class="project-details">
<h3 class="headline">${proj.headline}</h3>
<p class="byline">${proj.author}</p>
<p class="summary-text">${proj.summary}</p>
<a href="#" class="continue-link">Continue reading &rarr;</a>
</div>
</div>
</article>
`;
container.insertAdjacentHTML('beforeend', articleHTML);
});
}

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
