const taskList = document.getElementById("task-list");
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const emptyState = document.getElementById("empty-state");
const selectAllCheckbox = document.getElementById("select-all");
const deleteSelectedButton = document.getElementById("delete-selected");
const selectedCount = document.getElementById("selected-count");
const showAllButton = document.getElementById("show-all");
let cachedTasks = [];
let editingTaskId = null;
let editingTitle = "";
let selectedIds = new Set();

const renderTasks = () => {
  const tasks = cachedTasks;
  taskList.innerHTML = "";
  if (tasks.length === 0) {
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";
  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = "task-item";

    const select = document.createElement("input");
    select.type = "checkbox";
    select.className = "task-select";
    select.checked = selectedIds.has(task.id);
    select.addEventListener("change", (event) => {
      if (event.target.checked) {
        selectedIds.add(task.id);
      } else {
        selectedIds.delete(task.id);
      }
      syncBulkControls();
    });

    let titleNode;
    let editInput = null;
    if (editingTaskId === task.id) {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "task-edit-input";
      input.value = editingTitle;
      input.addEventListener("input", (event) => {
        editingTitle = event.target.value;
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          handleUpdate(task.id, input.value);
        }
        if (event.key === "Escape") {
          editingTaskId = null;
          editingTitle = "";
          renderTasks();
        }
      });
      editInput = input;
      titleNode = input;
    } else {
      const title = document.createElement("span");
      title.className = "task-title";
      title.textContent = task.title;
      titleNode = title;
    }

    const actions = document.createElement("div");
    actions.className = "task-actions";

    if (editingTaskId === task.id) {
      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.className = "action-btn";
      saveButton.textContent = "Save";
      saveButton.addEventListener("click", () => {
        handleUpdate(task.id, editInput ? editInput.value : editingTitle);
      });

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "action-btn secondary";
      cancelButton.textContent = "Cancel";
      cancelButton.addEventListener("click", () => {
        editingTaskId = null;
        editingTitle = "";
        renderTasks();
      });

      actions.appendChild(saveButton);
      actions.appendChild(cancelButton);
    } else {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "action-btn";
      editButton.textContent = "Update";
      editButton.addEventListener("click", () => {
        editingTaskId = task.id;
        editingTitle = task.title;
        renderTasks();
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "action-btn danger";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => {
        handleDelete(task.id);
      });

      actions.appendChild(editButton);
      actions.appendChild(deleteButton);
    }

    const id = document.createElement("span");
    id.className = "task-id";
    id.textContent = `#${task.id}`;

    const meta = document.createElement("div");
    meta.className = "task-meta";
    meta.appendChild(id);
    meta.appendChild(actions);

    item.appendChild(select);
    item.appendChild(titleNode);
    item.appendChild(meta);
    taskList.appendChild(item);
  });
};

const loadTasks = async () => {
  const response = await fetch("/api/tasks");
  cachedTasks = await response.json();
  if (editingTaskId && !cachedTasks.find((task) => task.id === editingTaskId)) {
    editingTaskId = null;
    editingTitle = "";
  }
  selectedIds = new Set(
    Array.from(selectedIds).filter((id) => cachedTasks.some((task) => task.id === id))
  );
  renderTasks();
  syncBulkControls();
};

const addTask = async (title) => {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) {
    return;
  }
  await response.json();
  await loadTasks();
};

const handleUpdate = async (taskId, updatedTitle) => {
  const title = (updatedTitle ?? editingTitle).trim();
  if (!title) {
    return;
  }
  const response = await fetch(`/api/tasks/${taskId}/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) {
    return;
  }
  await response.json();
  editingTaskId = null;
  editingTitle = "";
  await loadTasks();
};

const handleDelete = async (taskId) => {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    return;
  }
  await response.json();
  selectedIds.delete(taskId);
  await loadTasks();
};

const syncBulkControls = () => {
  const total = cachedTasks.length;
  const selected = selectedIds.size;
  selectedCount.textContent = `${selected} selected`;
  deleteSelectedButton.disabled = selected === 0;
  selectAllCheckbox.checked = total > 0 && selected === total;
  selectAllCheckbox.indeterminate = selected > 0 && selected < total;
};

const handleBulkDelete = async () => {
  if (selectedIds.size === 0) {
    return;
  }
  const ids = Array.from(selectedIds);
  const response = await fetch("/api/tasks/bulk-delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) {
    return;
  }
  await response.json();
  selectedIds = new Set();
  await loadTasks();
};

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) {
    return;
  }
  await addTask(title);
  taskInput.value = "";
  taskInput.focus();
});

selectAllCheckbox.addEventListener("change", (event) => {
  if (event.target.checked) {
    selectedIds = new Set(cachedTasks.map((task) => task.id));
  } else {
    selectedIds = new Set();
  }
  renderTasks();
  syncBulkControls();
});

deleteSelectedButton.addEventListener("click", async () => {
  await handleBulkDelete();
});

showAllButton.addEventListener("click", async () => {
  editingTaskId = null;
  editingTitle = "";
  selectedIds = new Set();
  await loadTasks();
});

loadTasks();
