"use strict";

// GitHub Pages 정적 배포용 버전.
// 백엔드(FastAPI) 없이 브라우저 localStorage에 데이터를 영구 저장한다.

const STORAGE_KEY = "todos";

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

/** 고유 ID 생성 (crypto 미지원 환경 대비 폴백 포함). */
function newId() {
  try {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
  } catch (e) {
    // 폴백으로 진행
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** localStorage에서 할 일 목록을 읽어온다. 손상/미지원 시 빈 배열로 복구. */
function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("형식 오류");
    }
    // 최소한의 형태 검증
    return parsed
      .filter((t) => t && typeof t.title === "string")
      .map((t) => ({
        id: t.id != null ? t.id : newId(),
        title: t.title,
        completed: Boolean(t.completed),
      }));
  } catch (e) {
    showError("저장된 데이터를 불러오지 못해 새로 시작합니다.");
    return [];
  }
}

/** 현재 상태를 localStorage에 저장한다. 용량 초과/비공개 모드 등 실패 처리. */
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    return true;
  } catch (e) {
    showError("저장에 실패했습니다. (저장 공간 부족 또는 비공개 모드)");
    return false;
  }
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

function addTodo(title) {
  const todo = { id: newId(), title, completed: false };
  todos.unshift(todo);
  if (!persist()) {
    // 저장 실패 시 메모리 상태 원복
    todos.shift();
    return;
  }
  render();
}

function toggleTodo(todo, checkbox) {
  const prev = todo.completed;
  todo.completed = checkbox.checked;
  if (!persist()) {
    // 실패 시 체크 상태 원복
    todo.completed = prev;
    checkbox.checked = prev;
    return;
  }
  render();
}

function deleteTodo(id) {
  const prev = todos;
  todos = todos.filter((t) => t.id !== id);
  if (!persist()) {
    todos = prev; // 실패 시 원복
    return;
  }
  render();
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
todos = loadTodos();
render();
