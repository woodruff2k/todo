"use strict";

const API = "/api/todos";

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const errorBox = document.getElementById("error");
const emptyMsg = document.getElementById("empty");
const summary = document.getElementById("summary");
const filterButtons = document.querySelectorAll(".filter");

let todos = [];
let currentFilter = "all"; // all | active | completed

/** 에러 메시지를 잠시 표시한다. */
function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  clearTimeout(showError._timer);
  showError._timer = setTimeout(() => {
    errorBox.hidden = true;
  }, 4000);
}

/** 공통 fetch 래퍼: 네트워크/서버 오류를 일관되게 처리한다. */
async function request(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (e) {
    throw new Error("서버에 연결할 수 없습니다.");
  }

  if (res.status === 204) {
    return null;
  }

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    const detail = data && data.detail ? data.detail : "요청 처리 중 오류가 발생했습니다.";
    throw new Error(typeof detail === "string" ? detail : "잘못된 요청입니다.");
  }
  return data;
}

function applyFilter(items) {
  if (currentFilter === "active") return items.filter((t) => !t.completed);
  if (currentFilter === "completed") return items.filter((t) => t.completed);
  return items;
}

function render() {
  const visible = applyFilter(todos);
  list.innerHTML = "";

  emptyMsg.hidden = visible.length !== 0;

  for (const todo of visible) {
    const li = document.createElement("li");
    li.className = "todo-item" + (todo.completed ? " completed" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.addEventListener("change", () => toggleTodo(todo, checkbox));

    const title = document.createElement("span");
    title.className = "title";
    title.textContent = todo.title;

    const del = document.createElement("button");
    del.className = "delete";
    del.textContent = "×";
    del.title = "삭제";
    del.addEventListener("click", () => deleteTodo(todo.id));

    li.append(checkbox, title, del);
    list.appendChild(li);
  }

  const remaining = todos.filter((t) => !t.completed).length;
  summary.textContent = todos.length
    ? `전체 ${todos.length}개 · 남은 할 일 ${remaining}개`
    : "";
}

async function loadTodos() {
  try {
    todos = await request(API);
    render();
  } catch (e) {
    showError(e.message);
  }
}

async function addTodo(title) {
  try {
    const created = await request(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    todos.unshift(created);
    render();
  } catch (e) {
    showError(e.message);
  }
}

async function toggleTodo(todo, checkbox) {
  try {
    const updated = await request(`${API}/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: checkbox.checked }),
    });
    Object.assign(todo, updated);
    render();
  } catch (e) {
    // 실패 시 체크 상태 원복
    checkbox.checked = todo.completed;
    showError(e.message);
  }
}

async function deleteTodo(id) {
  try {
    await request(`${API}/${id}`, { method: "DELETE" });
    todos = todos.filter((t) => t.id !== id);
    render();
  } catch (e) {
    showError(e.message);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) {
    showError("할 일을 입력하세요.");
    return;
  }
  addTodo(title);
  input.value = "";
  input.focus();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  });
});

// 초기 로드
loadTodos();
