const STORAGE_KEY = "assignment-tracker-tasks"; // localStorage key

let tasks = []; // 任務列表

const taskForm = document.getElementById("task-form"); // 表單
const statusFilterSelect = document.getElementById("statusFilter"); // 篩選選單
const taskTbody = document.getElementById("task-tbody"); // 表格 tbody

function loadTasks() { // 從 localStorage 載入
  const raw = localStorage.getItem(STORAGE_KEY); // 取得字串
  tasks = raw ? JSON.parse(raw) : []; // 轉回陣列
}

function saveTasks() { // 存回 localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); // 存成字串
}

function formatDate(dateString) { // 日期顯示用
  if (!dateString) return "-"; // 沒設定日期
  const date = new Date(dateString); // 建立 Date 物件
  if (Number.isNaN(date.getTime())) return dateString; // 防呆
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; // yyyy-mm-dd
}

function createStatusBadge(status) { // 產生狀態標籤
  const span = document.createElement("span"); // 建立span
  span.classList.add("status-badge"); // 基本class

  if (status === "todo") { // 待開始
    span.textContent = "待開始";
    span.classList.add("status-todo");
  } else if (status === "in-progress") { // 進行中
    span.textContent = "進行中";
    span.classList.add("status-in-progress");
  } else if (status === "done") { // 已完成
    span.textContent = "已完成";
    span.classList.add("status-done");
  } else {
    span.textContent = status || "-";
  }

  return span;
}

function renderTasks() { // 把 tasks 畫到表格
  const filter = statusFilterSelect.value; // 取得目前篩選
  taskTbody.innerHTML = ""; // 先清空

  const filtered = tasks.filter(task => { // 先依篩選過濾
    if (filter === "all") return true;
    return task.status === filter;
  });

  if (filtered.length === 0) { // 如果沒有資料，顯示一列提示
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "目前沒有作業資料，先在上面新增一筆吧！";
    tr.appendChild(td);
    taskTbody.appendChild(tr);
    return;
  }

  filtered.forEach(task => { // 對每筆任務建立一列
    const tr = document.createElement("tr");

    const titleTd = document.createElement("td");
    titleTd.textContent = task.title;

    const courseTd = document.createElement("td");
    courseTd.textContent = task.course;

    const dueTd = document.createElement("td");
    dueTd.textContent = formatDate(task.dueDate);

    const statusTd = document.createElement("td");
    statusTd.appendChild(createStatusBadge(task.status));

    const actionsTd = document.createElement("td");
    const actionsDiv = document.createElement("div");
    actionsDiv.classList.add("actions");

    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "切換狀態";
    toggleBtn.classList.add("btn-small");
    toggleBtn.addEventListener("click", () => handleToggleStatus(task.id)); // 切換狀態

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "刪除";
    deleteBtn.classList.add("btn-small");
    deleteBtn.addEventListener("click", () => handleDelete(task.id)); // 刪除

    actionsDiv.appendChild(toggleBtn);
    actionsDiv.appendChild(deleteBtn);
    actionsTd.appendChild(actionsDiv);

    tr.appendChild(titleTd);
    tr.appendChild(courseTd);
    tr.appendChild(dueTd);
    tr.appendChild(statusTd);
    tr.appendChild(actionsTd);

    taskTbody.appendChild(tr);
  });
}

function handleToggleStatus(id) { // 依序切換 todo -> in-progress -> done
  tasks = tasks.map(task => {
    if (task.id !== id) return task;
    let nextStatus = "todo";
    if (task.status === "todo") nextStatus = "in-progress";
    else if (task.status === "in-progress") nextStatus = "done";
    else if (task.status === "done") nextStatus = "todo";
    return { ...task, status: nextStatus };
  });
  saveTasks();
  renderTasks();
}

function handleDelete(id) { // 刪除特定任務
  tasks = tasks.filter(task => task.id !== id);
  saveTasks();
  renderTasks();
}

taskForm.addEventListener("submit", event => { // 處理新增表單送出
  event.preventDefault();

  const title = taskForm.title.value.trim(); // 作業名稱
  const course = taskForm.course.value.trim(); // 課程
  const dueDate = taskForm.dueDate.value; // 截止日
  const status = taskForm.status.value; // 狀態

  if (!title || !course) {
    alert("請填寫作業名稱與課程名稱！");
    return;
  }

  const newTask = {
    id: Date.now().toString(), // 簡單的唯一ID
    title,
    course,
    dueDate,
    status
  };

  tasks.push(newTask);
  saveTasks();
  renderTasks();
  taskForm.reset(); // 清空表單
});

statusFilterSelect.addEventListener("change", () => { // 篩選變更時重畫
  renderTasks();
});

loadTasks(); // 載入資料
renderTasks(); // 初始渲染
