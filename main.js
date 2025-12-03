const STORAGE_KEY = "assignment-tracker-tasks-plus"; // localStorage key

let tasks = []; // 所有作業
let editingTaskId = null; // 目前是否在編輯某筆作業

// DOM 元素
const taskForm = document.getElementById("task-form"); // 表單
const formTitle = document.getElementById("form-title"); // 表單標題
const submitBtn = document.getElementById("submit-btn"); // 送出按鈕
const cancelEditBtn = document.getElementById("cancel-edit-btn"); // 取消編輯按鈕

const statusFilterSelect = document.getElementById("statusFilter"); // 狀態篩選
const sortSelect = document.getElementById("sortSelect"); // 排序選單
const searchInput = document.getElementById("searchInput"); // 搜尋框
const taskTbody = document.getElementById("task-tbody"); // 表格 tbody

// 統計區 DOM
const statTotal = document.getElementById("stat-total"); // 總數
const statDone = document.getElementById("stat-done"); // 已完成
const statInProgress = document.getElementById("stat-in-progress"); // 進行中
const statTodo = document.getElementById("stat-todo"); // 待開始
const statRate = document.getElementById("stat-rate"); // 完成率

function loadTasks() { // 從 localStorage 載入
  const raw = localStorage.getItem(STORAGE_KEY); // 取得字串
  tasks = raw ? JSON.parse(raw) : []; // 沒有資料就給空陣列
}

function saveTasks() { // 存回 localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); // 存成 JSON 字串
}

function formatDate(dateString) { // 顯示日期用
  if (!dateString) return "-"; // 沒有日期就顯示 -
  const date = new Date(dateString); // 建立日期物件
  if (Number.isNaN(date.getTime())) return dateString; // 異常就原樣顯示
  const y = date.getFullYear(); // 年
  const m = String(date.getMonth() + 1).padStart(2, "0"); // 月
  const d = String(date.getDate()).padStart(2, "0"); // 日
  return `${y}-${m}-${d}`; // yyyy-mm-dd
}

function isOverdue(task) { // 判斷是否逾期
  if (!task.dueDate) return false; // 沒有日期不算
  if (task.status === "done") return false; // 完成的不算
  const today = new Date(); // 今天
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59); // 今天 23:59
  const due = new Date(task.dueDate); // 截止日
  return due < endOfToday; // 截止日早於今天→逾期
}

function createStatusBadge(status) { // 產生狀態 badge
  const span = document.createElement("span"); // 建立 span
  span.classList.add("status-badge"); // 基本 class

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

function getStatusDescription(task) { // 狀態說明文字
  if (isOverdue(task)) return "已超過截止日期，尚未完成"; // 逾期
  if (task.status === "todo") return "尚未開始，可以排一下優先順序"; // 待開始
  if (task.status === "in-progress") return "進行中，記得注意截止日期"; // 進行中
  if (task.status === "done") return "已完成，可以安心睡覺了"; // 已完成
  return "";
}

function updateStats() { // 更新統計數字
  const total = tasks.length; // 總筆數
  const doneCount = tasks.filter(t => t.status === "done").length; // 完成數
  const inProgressCount = tasks.filter(t => t.status === "in-progress").length; // 進行中
  const todoCount = tasks.filter(t => t.status === "todo").length; // 待開始
  const rate = total === 0 ? 0 : Math.round((doneCount / total) * 100); // 完成率 %

  statTotal.textContent = `總數：${total}`; // 顯示
  statDone.textContent = `已完成：${doneCount}`;
  statInProgress.textContent = `進行中：${inProgressCount}`;
  statTodo.textContent = `待開始：${todoCount}`;
  statRate.textContent = `完成率：${rate}%`;
}

function getFilteredAndSortedTasks() { // 依搜尋 / 篩選 / 排序取得要顯示的陣列
  const filter = statusFilterSelect.value; // 狀態篩選
  const searchKeyword = searchInput.value.trim().toLowerCase(); // 搜尋關鍵字
  const sortMode = sortSelect.value; // 排序模式

  let result = tasks.filter(task => { // 先做篩選 + 搜尋
    if (filter !== "all" && task.status !== filter) return false; // 狀態不符
    if (searchKeyword) { // 有輸入關鍵字
      const text = `${task.title} ${task.course}`.toLowerCase(); // 合併標題+課程
      if (!text.includes(searchKeyword)) return false; // 沒包含就排除
    }
    return true;
  });

  if (sortMode === "due-asc" || sortMode === "due-desc") { // 依日期排序
    result.sort((a, b) => {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity; // 沒日期放最後
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (sortMode === "due-asc") return da - db; // 舊→新
      return db - da; // 新→舊
    });
  } else if (sortMode === "status") { // 依狀態排序
    const order = { "todo": 0, "in-progress": 1, "done": 2 }; // 排序順序
    result.sort((a, b) => {
      const oa = order[a.status] ?? 99;
      const ob = order[b.status] ?? 99;
      if (oa !== ob) return oa - ob; // 先比狀態
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity; // 同狀態再比日期
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return da - db;
    });
  }

  return result;
}

function renderTasks() { // 把 tasks 畫到表格
  const visibleTasks = getFilteredAndSortedTasks(); // 先經過搜尋/篩選/排序
  taskTbody.innerHTML = ""; // 清空 tbody

  if (visibleTasks.length === 0) { // 沒有資料時
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6; // 6 欄
    td.textContent = "目前沒有符合條件的作業，可以試試調整搜尋或篩選。";
    tr.appendChild(td);
    taskTbody.appendChild(tr);
    updateStats(); // 仍然要更新統計
    return;
  }

  visibleTasks.forEach(task => { // 對每筆任務建立一列
    const tr = document.createElement("tr");

    if (isOverdue(task)) tr.classList.add("row-overdue"); // 逾期加上紅底

    const titleTd = document.createElement("td");
    titleTd.textContent = task.title;

    const courseTd = document.createElement("td");
    courseTd.textContent = task.course;

    const dueTd = document.createElement("td");
    dueTd.textContent = formatDate(task.dueDate);

    const statusTd = document.createElement("td");
    statusTd.appendChild(createStatusBadge(task.status)); // 狀態 badge

    const descTd = document.createElement("td");
    descTd.textContent = getStatusDescription(task); // 狀態說明

    const actionsTd = document.createElement("td");
    const actionsDiv = document.createElement("div");
    actionsDiv.classList.add("actions");

    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "切換狀態";
    toggleBtn.classList.add("btn-small");
    toggleBtn.addEventListener("click", () => handleToggleStatus(task.id)); // 切換狀態

    const editBtn = document.createElement("button");
    editBtn.textContent = "編輯";
    editBtn.classList.add("btn-small");
    editBtn.addEventListener("click", () => handleEdit(task.id)); // 編輯

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "刪除";
    deleteBtn.classList.add("btn-small");
    deleteBtn.addEventListener("click", () => handleDelete(task.id)); // 刪除

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

  updateStats(); // 每次 render 後更新統計
}

function handleToggleStatus(id) { // 切換 todo -> in-progress -> done
  tasks = tasks.map(task => {
    if (task.id !== id) return task;
    let nextStatus = "todo";
    if (task.status === "todo") nextStatus = "in-progress";
    else if (task.status === "in-progress") nextStatus = "done";
    else if (task.status === "done") nextStatus = "todo";
    return { ...task, status: nextStatus };
  });
  saveTasks(); // 存檔
  renderTasks(); // 重畫
}

function handleDelete(id) { // 刪除作業
  const ok = window.confirm("確定要刪除這筆作業嗎？"); // 簡單防呆
  if (!ok) return;
  tasks = tasks.filter(task => task.id !== id);
  saveTasks();
  renderTasks();

  if (editingTaskId === id) { // 如果剛好在編輯這筆也一併重置
    resetForm();
  }
}

function handleEdit(id) { // 進入編輯模式
  const task = tasks.find(t => t.id === id); // 找對應的任務
  if (!task) return;

  editingTaskId = id; // 記錄目前在編輯的ID
  formTitle.textContent = "編輯作業"; // 更改標題
  submitBtn.textContent = "更新作業"; // 按鈕文字
  cancelEditBtn.classList.remove("hidden"); // 顯示取消按鈕

  taskForm.title.value = task.title; // 帶入舊資料
  taskForm.course.value = task.course;
  taskForm.dueDate.value = task.dueDate;
  taskForm.status.value = task.status;
}

function resetForm() { // 回到新增模式
  editingTaskId = null;
  formTitle.textContent = "新增作業"; // 標題
  submitBtn.textContent = "加入清單"; // 按鈕文字
  cancelEditBtn.classList.add("hidden"); // 隱藏取消按鈕
  taskForm.reset(); // 清空表單
}

taskForm.addEventListener("submit", event => { // 表單送出
  event.preventDefault(); // 阻止原本 submit

  const title = taskForm.title.value.trim(); // 作業名稱
  const course = taskForm.course.value.trim(); // 課程名稱
  const dueDate = taskForm.dueDate.value; // 截止日
  const status = taskForm.status.value; // 狀態

  if (!title || !course) { // 簡單檢查
    alert("請填寫作業名稱與課程名稱！");
    return;
  }

  if (editingTaskId) { // 編輯模式
    tasks = tasks.map(task => {
      if (task.id !== editingTaskId) return task;
      return {
        ...task,
        title,
        course,
        dueDate,
        status
      };
    });
  } else { // 新增模式
    const newTask = {
      id: Date.now().toString(), // 簡單唯一ID
      title,
      course,
      dueDate,
      status
    };
    tasks.push(newTask);
  }

  saveTasks(); // 存檔
  renderTasks(); // 重畫
  resetForm(); // 回到新增模式
});

cancelEditBtn.addEventListener("click", () => { // 取消編輯
  resetForm();
});

statusFilterSelect.addEventListener("change", () => { // 篩選變更
  renderTasks();
});

sortSelect.addEventListener("change", () => { // 排序變更
  renderTasks();
});

searchInput.addEventListener("input", () => { // 搜尋輸入變更
  renderTasks();
});

// 初始化
loadTasks(); // 載入 localStorage
renderTasks(); // 初始渲染
