let currentViewDate = new Date();
let logoClickCount = 0;
let selectedDateStr = "";

const isAdmin = () => sessionStorage.getItem("isAdmin") === "true";

// 실시간 데이터 가져오기 및 페이지 렌더링
function renderPage(target) {
    const contentArea = document.getElementById('main-content');
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-target') === target);
    });

    if (target === 'calendar') {
        contentArea.innerHTML = `
            <div class="calendar-container">
                <div class="calendar-header-nav" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <button id="prevMonth" class="nav-btn">◀</button>
                    <div id="currentMonthYear" style="font-size: 1.2rem; font-weight: bold;"></div>
                    <button id="nextMonth" class="nav-btn">▶</button>
                </div>
                <table class="calendar-table">
                    <thead>
                        <tr><th style="color:#e74c3c">일</th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th style="color:#3498db">토</th></tr>
                    </thead>
                    <tbody id="calendar-body"></tbody>
                </table>
            </div>
            <div id="schedule-box" class="course-card" style="margin-top:20px;">
                <h4 id="selected-date-title">날짜를 선택해 주세요</h4>
                <div id="admin-sched-input-group" style="display:none;"></div>
                <ul id="daily-schedule-items" style="list-style:none;"></ul>
            </div>`;
        renderCalendar();
    } 
    else if (['notice', 'event', 'community'].includes(target)) {
        const titles = { notice: "📢 공지사항", event: "📣 이벤트", community: "💬 커뮤니티" };
        
        // Firebase에서 데이터 읽기
        db.ref(target + 's').on('value', (snapshot) => {
            const dataObj = snapshot.val() || {};
            const dataList = Object.keys(dataObj).map(key => ({ id: key, ...dataObj[key] })).reverse();

            contentArea.innerHTML = `
                <h2>${titles[target]}</h2>
                ${isAdmin() ? `
                    <div class="admin-write-section" style="background:#f1f5f9; padding:20px; border-radius:12px; margin-bottom:20px;">
                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <input type="text" id="post-input" style="flex:1; padding:10px; border-radius:8px; border:1px solid #ddd;" placeholder="내용을 입력하세요...">
                            <button onclick="addPost('${target}')" style="padding:10px 20px; background:var(--primary-color); color:white; border:none; border-radius:8px; cursor:pointer;">등록</button>
                        </div>
                        <div style="font-size:0.85rem;">
                            기간: <input type="date" id="post-start-date"> ~ <input type="date" id="post-end-date">
                        </div>
                    </div>` : ""}
                <div id="post-list">
                    ${dataList.map((item) => `
                        <div class="course-card">
                            <div style="display:flex; justify-content:space-between;">
                                <div>
                                    ${item.start ? `<span style="background:#eef2ff; color:#6366f1; padding:2px 8px; border-radius:4px; font-size:0.8rem;">${item.start} ~ ${item.end}</span>` : ""}
                                    <div style="margin-top:10px; font-size:1.1rem;">${item.text}</div>
                                </div>
                                ${isAdmin() ? `<button onclick="deletePost('${target}', '${item.id}')" style="color:red; border:none; background:none; cursor:pointer;">삭제</button>` : ""}
                            </div>
                        </div>`).join('') || '<p style="text-align:center; padding:40px; color:#94a3b8;">게시물이 없습니다.</p>'}
                </div>`;
        });
    }
    else if (target === 'admin') {
        contentArea.innerHTML = `<h2>⚙️ 어드민 설정</h2><div class="course-card"><h3>관리자 모드가 활성화되어 있습니다.</h3></div>`;
    }
    else {
        contentArea.innerHTML = `<div style="text-align:center; padding:50px;"><img src="Image/Main_Img.webp" style="max-width:100%; border-radius:20px;"></div>`;
    }
}

// 캘린더 렌더링 (Firebase 연동)
function renderCalendar() {
    db.ref('schedules').on('value', (snapshot) => {
        const allSchedulesObj = snapshot.val() || {};
        const allSchedules = Object.values(allSchedulesObj);
        
        const viewYear = currentViewDate.getFullYear();
        const viewMonth = currentViewDate.getMonth();
        const calendarBody = document.getElementById('calendar-body');
        const header = document.getElementById('currentMonthYear');
        if(!calendarBody) return;

        header.innerText = `${viewYear}년 ${viewMonth + 1}월`;
        const firstDay = new Date(viewYear, viewMonth, 1).getDay();
        const lastDate = new Date(viewYear, viewMonth + 1, 0).getDate();

        let html = "";
        let date = 1;
        for (let i = 0; i < 6; i++) {
            html += "<tr>";
            for (let j = 0; j < 7; j++) {
                if (i === 0 && j < firstDay || date > lastDate) html += "<td></td>";
                else {
                    const fullDate = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(date).padStart(2,'0')}`;
                    const isToday = (new Date().toDateString() === new Date(viewYear, viewMonth, date).toDateString()) ? "today" : "";
                    const dailySchedules = allSchedules.filter(s => fullDate >= s.start && fullDate <= s.end);
                    const tagsOnDay = [...new Set(dailySchedules.map(s => s.tag))];

                    let barsHtml = '<div class="calendar-bar-container">';
                    tagsOnDay.forEach(tag => {
                        const barClass = tag === '이벤트' ? 'bar-event' : tag === '일정' ? 'bar-task' : 'bar-etc';
                        barsHtml += `<div class="calendar-bar ${barClass}"></div>`;
                    });
                    barsHtml += '</div>';

                    html += `<td class="${isToday}" data-date="${fullDate}"><span>${date}</span>${barsHtml}</td>`;
                    date++;
                }
            }
            html += "</tr>";
            if (date > lastDate) break;
        }
        calendarBody.innerHTML = html;

        calendarBody.querySelectorAll('td[data-date]').forEach(td => {
            td.onclick = () => { selectedDateStr = td.getAttribute('data-date'); showSchedule(selectedDateStr); };
        });
    });
}

document.addEventListener('click', (e) => {
    if(e.target.id === 'prevMonth') { currentViewDate.setMonth(currentViewDate.getMonth() - 1); renderCalendar(); }
    if(e.target.id === 'nextMonth') { currentViewDate.setMonth(currentViewDate.getMonth() + 1); renderCalendar(); }
});

// 상세 일정 표시
function showSchedule(dateStr) {
    const list = document.getElementById('daily-schedule-items');
    const title = document.getElementById('selected-date-title');
    const inputGroup = document.getElementById('admin-sched-input-group');
    title.innerText = `${dateStr} 일정`;
    
    if(isAdmin() && inputGroup) {
        inputGroup.innerHTML = `
            <div style="background:#f8fafc; padding:15px; border-radius:10px; margin-bottom:15px; border:1px solid #e2e8f0;">
                <select id="sched-tag-select"><option value="일정">일정</option><option value="이벤트">이벤트</option><option value="기타">기타</option></select>
                <input type="text" id="new-sched-val" placeholder="새 일정 입력">
                <input type="date" id="sched-start-date" value="${dateStr}"> ~ <input type="date" id="sched-end-date" value="${dateStr}">
                <button onclick="addSchedule()">추가</button>
            </div>`;
        inputGroup.style.display = "block";
    }

    db.ref('schedules').once('value', (snapshot) => {
        const dataObj = snapshot.val() || {};
        const daily = Object.keys(dataObj)
            .map(key => ({ id: key, ...dataObj[key] }))
            .filter(s => dateStr >= s.start && dateStr <= s.end);
        
        list.innerHTML = daily.length > 0 ? daily.map((item) => `
            <li style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                <div><strong>[${item.tag}]</strong> ${item.text}</div>
                ${isAdmin() ? `<button onclick="deleteSchedule('${item.id}')" style="color:red; border:none; background:none; cursor:pointer;">삭제</button>` : ""}
            </li>`).join('') : "<li style='padding:20px; color:#94a3b8;'>등록된 일정이 없습니다.</li>";
    });
}

// Firebase 관리자 액션
window.addPost = (type) => {
    const val = document.getElementById('post-input').value;
    const start = document.getElementById('post-start-date').value;
    const end = document.getElementById('post-end-date').value;
    if(!val) return;
    db.ref(type + 's').push({ text: val, start: start || null, end: end || null });
};

window.deletePost = (type, id) => {
    if(confirm("삭제하시겠습니까?")) db.ref(`${type}s/${id}`).remove();
};

window.addSchedule = () => {
    const val = document.getElementById('new-sched-val').value;
    const tag = document.getElementById('sched-tag-select').value;
    const start = document.getElementById('sched-start-date').value;
    const end = document.getElementById('sched-end-date').value;
    if(!val || !start || !end) return alert("필수 정보를 입력해주세요.");
    db.ref('schedules').push({ text: val, tag: tag, start: start, end: end });
};

window.deleteSchedule = (id) => {
    if(confirm("삭제하시겠습니까?")) db.ref(`schedules/${id}`).remove();
};

// 로그인 로직 (동일)
document.getElementById('header-logo').onclick = () => {
    if (!isAdmin()) {
        logoClickCount++;
        if (logoClickCount >= 5) { document.getElementById('login-modal').style.display = "flex"; logoClickCount = 0; }
    }
};

document.getElementById('login-submit').onclick = () => {
    const id = document.getElementById('admin-id').value;
    const pw = document.getElementById('admin-pw').value;
    if (id === "admin" && pw === "1234") { sessionStorage.setItem("isAdmin", "true"); location.reload(); }
};

document.getElementById('login-close').onclick = () => { document.getElementById('login-modal').style.display = "none"; };
// document.getElementById('logout-btn').onclick = () => { sessionStorage.removeItem("isAdmin"); location.reload(); };

document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => renderPage(item.getAttribute('data-target')));
});

window.onload = () => {
    if (isAdmin()) {
        document.getElementById('admin-tag').style.display = "inline-block";
        document.getElementById('logout-btn').style.display = "block";
        document.getElementById('admin-menu').style.display = "block";
    }
    renderPage('main');
};