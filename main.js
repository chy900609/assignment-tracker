// ====== 後端 API 基礎網址（務必改成你的實際 URL） ======
const API_BASE = "https://chy900609-assignment-tracker-backend.onrender.com/api"; // TODO: 換成自己的

// ====== 狀態變數 ======
let tasks = [];            // 目前登入使用者的作業
let editingTaskId = null;  // 正在編輯哪一筆作業（id）
let currentUser = null;    // 目前登入帳號
let authToken = null;      // 後端回傳的 token（這裡就是 username）

// ====== DOM 取得 ======

// 登入相關
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const authForm = document.getElementById("auth-form");
const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const logoutBtn = document.getElementById("logout-btn");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const currentUserLabel = document.getElementById("current-user-label");

// 作業表單相關
const taskForm = document.getElementById("task-form");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

// 篩選 / 排序 / 搜尋
const statusFilterSelect = document.getElementById("statusFilter");
const sortSelect = document.getElementById("sortSelect");
const searchInput = document.getElementById("searchInput");
const taskTbody = document.getElementById("task-tbody");

// 統計區
const statTotal = document.getElementById("stat-total");
const statDone = document.getElementById("stat-done");
const statInProgress = document.getElementById("stat-in-progress");
const statTodo = document.getElementById("stat-todo");
const statRate = document.getElementById("stat-rate");

// ====== 共用工具 ======

function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isOverdue(task) {
  if (!task.dueDate) return false;
  if (task.status === "done") return false;
  const today = new Date();
  const endOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59
  );
  const due = new Date(task.dueDate);
  return due < endOfToday;
}

function createStatusBadge(status) {
  const span = document.createElement("span");
  span.classList.add("status-badge");

  if (status === "todo") {
    span.textContent = "待開始";
    span.classList.add("status-todo");
  } else if (status === "in-progress") {
    span.textContent = "進行中";
    span.classList.add("status-in-progress");
  } else if (status === "done") {
    span.textContent = "已完成";
    span.classList.add("status-done");
  } else {
    span.textContent = status || "-";
  }

  return span;
}

function getStatusDescription(task) {
  if (isOverdue(task)) return "已超過截止日期，尚未完成";
  if (task.status === "todo") return "尚未開始，可以排一下優先順序";
  if (task.status === "in-progress") return "進行中，記得注意截止日期";
  if (task.status === "done") return "已完成，可以安心睡覺了";
  return "";
}

function updateStats() {
  const total = tasks.length;
  const doneCount = tasks.filter(t => t.status === "done").length;
  const inProgressCount = tasks.filter(t => t.status === "in-progress").length;
  const todoCount = tasks.filter(t => t.status === "todo").length;
  const rate = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  statTotal.textContent = `總數：${total}`;
  statDone.textContent = `已完成：${doneCount}`;
  statInProgress.textContent = `進行中：${inProgressCount}`;
  statTodo.textContent = `待開始：${todoCount}`;
  statRate.textContent = `完成率：${rate}%`;
}

// 搜尋 / 篩選 / 排序
function getFilteredAndSortedTasks() {
  const filter = statusFilterSelect.value;
  const searchKeyword = searchInput.value.trim().toLowerCase();
  const sortMode = sortSelect.value;

  let result = tasks.filter(task => {
    if (filter !== "all" && task.status !== filter) return false;
    if (searchKeyword) {
      const text = `${task.title} ${task.course}`.toLowerCase();
      if (!text.includes(searchKeyword)) return false;
    }
    return true;
  });

  if (sortMode === "due-asc" || sortMode === "due-desc") {
    result.sort((a, b) => {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (sortMode === "due-asc") return da - db;
      return db - da;
    });
  } else if (sortMode === "status") {
    const order = { "todo": 0, "in-progress": 1, "done": 2 };
    result.sort((a, b) => {
      const oa = order[a.status] ?? 99;
      const ob = order[b.status] ?? 99;
      if (oa !== ob) return oa - ob;
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return da - db;
    });
  }

  return result;
}

// ====== 畫出作業表格 ======

function renderTasks() {
  const visibleTasks = getFilteredAndSortedTasks();
  taskTbody.innerHTML = "";

  if (!currentUser || !authToken) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "請先登入以管理作業清單。";
    tr.appendChild(td);
    taskTbody.appendChild(tr);
    updateStats();
    return;
  }

  if (visibleTasks.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "目前沒有符合條件的作業，可以先新增一筆。";
    tr.appendChild(td);
    taskTbody.appendChild(tr);
    updateStats();
    return;
  }

  visibleTasks.forEach(task => {
    const tr = document.createElement("tr");

    if (isOverdue(task)) tr.classList.add("row-overdue");

    const titleTd = document.createElement("td");
    titleTd.textContent = task.title;

    const courseTd = document.createElement("td");
    courseTd.textContent = task.course;

    const dueTd = document.createElement("td");
    dueTd.textContent = formatDate(task.dueDate);

    const statusTd = document.createElement("td");
    statusTd.appendChild(createStatusBadge(task.status));

    const descTd = document.createElement("td");
    descTd.textContent = getStatusDescription(task);

    const actionsTd = document.createElement("td");
    const actionsDiv = document.createElement("div");
    actionsDiv.classList.add("actions");

    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "切換狀態";
    toggleBtn.classList.add("btn-small");
    toggleBtn.addEventListener("click", () => handleToggleStatus(task.id));

    const editBtn = document.createElement("button");
    editBtn.textContent = "編輯";
    editBtn.classList.add("btn-small");
    editBtn.addEventListener("click", () => handleEdit(task.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "刪除";
    deleteBtn.classList.add("btn-small");
    deleteBtn.addEventListener("click", () => handleDelete(task.id));

    actionsDiv.appendChild(toggleBtn);
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    actionsTd.appendChild(actionsDiv);

    tr.appendChild(titleTd);
    tr.appendChild(courseTd);
    tr.appendChild(dueTd);
    tr.appendChild(statusTd);
    tr.appendChild(descTd);
    tr.appendChild(actionsTd);

    taskTbody.appendChild(tr);
  });

  updateStats();
}

// ====== 後端 API 呼叫 ======

async function apiGetTasks() {
  if (!authToken) {
    tasks = [];
    renderTasks();
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    if (!res.ok) {
      throw new Error("取得作業失敗");
    }
    const data = await res.json();
    tasks = data || [];
    renderTasks();
  } catch (err) {
    console.error(err);
    alert("從後端取得作業失敗：" + err.message);
  }
}

async function apiCreateTask(task) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify(task)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "新增作業失敗");
  }
  return res.json();
}

async function apiUpdateTask(id, patch) {
  const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify(patch)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "更新作業失敗");
  }
  return res.json();
}

async function apiDeleteTask(id) {
  const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "刪除作業失敗");
  }
}

// ====== 作業操作 ======

async function handleToggleStatus(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  let nextStatus = "todo";
  if (task.status === "todo") nextStatus = "in-progress";
  else if (task.status === "in-progress") nextStatus = "done";
  else if (task.status === "done") nextStatus = "todo";

  try {
    const updated = await apiUpdateTask(id, { status: nextStatus });
    tasks = tasks.map(t => (t.id === id ? updated : t));
    renderTasks();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

async function handleDelete(id) {
  const ok = window.confirm("確定要刪除這筆作業嗎？");
  if (!ok) return;

  try {
    await apiDeleteTask(id);
    tasks = tasks.filter(t => t.id !== id);
    if (editingTaskId === id) resetForm();
    renderTasks();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

function handleEdit(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editingTaskId = id;
  formTitle.textContent = "編輯作業";
  submitBtn.textContent = "更新作業";
  cancelEditBtn.classList.remove("hidden");

  taskForm.title.value = task.title;
  taskForm.course.value = task.course;
  taskForm.dueDate.value = task.dueDate || "";
  taskForm.status.value = task.status;
}

function resetForm() {
  editingTaskId = null;
  formTitle.textContent = "新增作業";
  submitBtn.textContent = "加入清單";
  cancelEditBtn.classList.add("hidden");
  taskForm.reset();
}

// ====== 登入 / 註冊 / 登出 ======

function loadAuthFromStorage() {
  currentUser = localStorage.getItem("assignment-tracker-current-user") || null;
  authToken = localStorage.getItem("assignment-tracker-token") || null;
}

function saveAuthToStorage() {
  if (currentUser && authToken) {
    localStorage.setItem("assignment-tracker-current-user", currentUser);
    localStorage.setItem("assignment-tracker-token", authToken);
  }
}

function clearAuth() {
  currentUser = null;
  authToken = null;
  localStorage.removeItem("assignment-tracker-current-user");
  localStorage.removeItem("assignment-tracker-token");
}

function refreshUIByAuth() {
  if (currentUser && authToken) {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    currentUserLabel.textContent = `目前登入：${currentUser}`;
    resetForm();
    apiGetTasks();
  } else {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    currentUserLabel.textContent = "目前未登入";
    tasks = [];
    taskTbody.innerHTML = "";
    updateStats();
  }
}

async function handleRegister() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    alert("請輸入帳號與密碼！");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "註冊失敗");
    }
    alert("註冊成功，請重新登入。");
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

async function handleLogin() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    alert("請輸入帳號與密碼！");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "登入失敗");
    }
    authToken = data.token;
    currentUser = data.username;
    saveAuthToStorage();
    usernameInput.value = "";
    passwordInput.value = "";
    refreshUIByAuth();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

function handleLogout() {
  const ok = window.confirm("確定要登出嗎？");
  if (!ok) return;
  clearAuth();
  resetForm();
  refreshUIByAuth();
}

// ====== 事件綁定 ======

// 新增 / 更新作業
taskForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentUser || !authToken) {
    alert("請先登入再新增作業！");
    return;
  }

  const title = taskForm.title.value.trim();
  const course = taskForm.course.value.trim();
  const dueDate = taskForm.dueDate.value;
  const status = taskForm.status.value;

  if (!title || !course) {
    alert("請填寫作業名稱與課程名稱！");
    return;
  }

  try {
    if (editingTaskId) {
      const updated = await apiUpdateTask(editingTaskId, {
        title,
        course,
        dueDate,
        status
      });
      tasks = tasks.map(t => (t.id === editingTaskId ? updated : t));
    } else {
      const created = await apiCreateTask({
        title,
        course,
        dueDate,
        status
      });
      tasks.push(created);
    }
    renderTasks();
    resetForm();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

cancelEditBtn.addEventListener("click", () => {
  resetForm();
});

statusFilterSelect.addEventListener("change", () => {
  renderTasks();
});

sortSelect.addEventListener("change", () => {
  renderTasks();
});

searchInput.addEventListener("input", () => {
  renderTasks();
});

loginBtn.addEventListener("click", () => {
  handleLogin();
});

registerBtn.addEventListener("click", () => {
  handleRegister();
});

logoutBtn.addEventListener("click", () => {
  handleLogout();
});

// ====== 初始化 ======

loadAuthFromStorage();
refreshUIByAuth();
