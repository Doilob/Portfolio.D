// ➕ 신규 프로젝트 등록 2단계 저장 및 중복 방지
  const formEl = document.getElementById('project-form');
  let adminSaveConfirmState = false;

  if (formEl) {
    const submitBtn = formEl.querySelector('button[type="submit"]');

    formEl.addEventListener('submit', async function(e) {
      e.preventDefault();

      if (!isAuthorized()) {
        alert("🔒 프로젝트 추가는 토큰 인증이 필요합니다. 우측 상단의 [GUEST 🔒] 배지를 클릭해 먼저 인증해 주세요.");
        return;
      }

      // 1단계: 정말 저장할지 확인
      if (!adminSaveConfirmState) {
        adminSaveConfirmState = true;
        submitBtn.innerText = "❓ 정말 저장하시겠습니까?";
        submitBtn.style.background = "var(--accent-orange, #c84b29)";
        
        setTimeout(() => {
          if (adminSaveConfirmState && !submitBtn.disabled) {
            adminSaveConfirmState = false;
            submitBtn.innerText = "💾 Save Project";
            submitBtn.style.background = "var(--text-main)";
          }
        }, 5000);
        return;
      }

      // 2단계: 저장 진행 (버튼 비활성화)
      submitBtn.disabled = true;
      submitBtn.innerText = "⏳ 저장 중...";
      submitBtn.style.background = "var(--accent-gray, #6c757d)";

      try {
        const fileInput = document.getElementById('p-image-file');
        let base64Image = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';

        if (fileInput && fileInput.files.length > 0) {
          try {
            base64Image = await compressAndConvertToBase64(fileInput.files[0]);
          } catch (err) {
            alert('이미지 처리 중 오류가 발생했습니다.');
          }
        }

        const newProj = {
          id: 'proj-' + Date.now(),
          title: document.getElementById('p-title').value,
          status: document.getElementById('p-status').value,
          badgeTag: document.getElementById('p-tag').value || 'PROJECT',
          headline: document.getElementById('p-headline').value,
          author: document.getElementById('p-author').value || 'by Author',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          image: base64Image,
          summary: document.getElementById('p-summary').value
        };

        projectsCache.unshift(newProj);
        await saveProjectsToCloud(projectsCache);
        
        this.reset();
        alert("☁️ 신규 프로젝트가 등록되었습니다!");
      } catch (err) {
        alert("저장 도중 오류가 발생했습니다.");
      } finally {
        adminSaveConfirmState = false;
        submitBtn.disabled = false;
        submitBtn.innerText = "💾 Save Project";
        submitBtn.style.background = "var(--text-main)";
      }
    });
  }
