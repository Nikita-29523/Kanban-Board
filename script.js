// script.js - Kanban logic, DSL parsing

/* -------------------- Initial state & defaults -------------------- */
let taskId = 0;
let draggedTask = null;

// default rules
let columnRules = {
  "InProgress": { maxCards: 3 },
  "Done": { requireChecklist: true },
  "Review": { autoAssign: "QA Team" }
};

/* -------------------- Helpers -------------------- */
function $(id) { return document.getElementById(id); }

/* -------------------- Task creation -------------------- */
function createTaskElement(title) {
  const task = document.createElement('div');
  task.className = 'task bg-white dark:bg-gray-700 p-3 rounded-lg shadow mb-3 hover:shadow-lg transition transform';
  task.draggable = true;
  task.id = `task-${taskId++}`;
  task.dataset.checklist = "false";

  task.innerHTML = `
    <div class="flex justify-between items-start gap-2">
      <div class="flex-1">
        <div class="font-medium text-gray-800 dark:text-gray-100">${escapeHtml(title)}</div>
        <label class="text-sm text-gray-600 dark:text-gray-300 mt-2 inline-flex items-center gap-2">
          <input type="checkbox" class="checklist" />
          <span class="text-xs">Checklist complete</span>
        </label>
        <p class="reviewer text-xs text-gray-500 dark:text-gray-300 mt-2 hidden"></p>
      </div>
      <div>
        <button class="delete-btn text-red-500 hover:text-red-700 ml-2" aria-label="Delete task">✕</button>
      </div>
    </div>
  `;

  // events
  task.addEventListener('dragstart', () => {
    draggedTask = task;
    task.classList.add('dragging');
    setTimeout(() => task.style.display = 'block', 0);
  });

  task.addEventListener('dragend', () => {
    if (task) {
      task.classList.remove('dragging');
    }
    draggedTask = null;
    document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
  });

  // checklist change
  const checkbox = task.querySelector('.checklist');
  checkbox.addEventListener('change', () => {
    task.dataset.checklist = checkbox.checked ? "true" : "false";
  });

  // delete button
  const delBtn = task.querySelector('.delete-btn');
  delBtn.addEventListener('click', () => {
    task.remove();
  });

  return task;
}

function addTaskFromInput() {
  const input = $('taskInput');
  const text = input.value.trim();
  if (!text) return;
  const task = createTaskElement(text);
  $('Todo').appendChild(task);
  input.value = '';
}

/* -------------------- Drag & Drop handlers -------------------- */
function allowDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.add('drag-over');
}

function onDrop(event, columnId) {
  event.preventDefault();
  const col = $(columnId);
  if (!col) return;

  col.classList.remove('drag-over');
  $('error').textContent = '';

  if (!draggedTask) return;

  const rules = columnRules[columnId] || {};

  // maxCards rule
  if (rules.maxCards) {
    const count = col.querySelectorAll('.task').length;
    if (count >= rules.maxCards) {
      $('error').textContent = `❌ Only ${rules.maxCards} tasks allowed in '${columnId}'.`;
      return;
    }
  }

  // requireChecklist rule
  if (rules.requireChecklist && draggedTask.dataset.checklist !== "true") {
    $('error').textContent = `❌ Checklist must be complete to move to '${columnId}'.`;
    return;
  }

  // autoAssign rule
  if (rules.autoAssign) {
    const reviewerEl = draggedTask.querySelector('.reviewer');
    reviewerEl.classList.remove('hidden');
    reviewerEl.textContent = `👤 Assigned to: ${rules.autoAssign}`;
  }

  col.appendChild(draggedTask);
  draggedTask.classList.remove('dragging');
  draggedTask = null;
}

/* Remove drag-over highlight when leaving a column */
document.querySelectorAll('.column').forEach(col => {
  col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
});

/* -------------------- DSL: apply & reset -------------------- */
function applyDSL() {
  const raw = $('dslRules').value.trim();
  if (!raw) {
    $('dslMsg').textContent = 'Please provide rules in JSON format (see placeholder).';
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      $('dslMsg').textContent = 'DSL must be a JSON object keyed by column id.';
      return;
    }
    columnRules = parsed;
    $('dslMsg').textContent = '✅ Rules applied';
    $('dslMsg').classList.remove('text-red-500');
    setTimeout(() => $('dslMsg').textContent = '', 1800);
  } catch (err) {
    $('dslMsg').textContent = 'Invalid JSON — please fix syntax.';
    $('dslMsg').classList.add('text-red-500');
  }
}

function resetRules() {
  columnRules = {
    "InProgress": { maxCards: 3 },
    "Done": { requireChecklist: true },
    "Review": { autoAssign: "QA Team" }
  };
  $('dslRules').value = JSON.stringify(columnRules, null, 2);
  $('dslMsg').textContent = 'Rules reset to default';
  setTimeout(() => $('dslMsg').textContent = '', 1400);
}

/* -------------------- Utility: escape HTML -------------------- */
function escapeHtml(unsafe) {
  return unsafe.replace(/[&<"'>]/g, function(m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
      default: return m;
    }
  });
}

/* -------------------- Wiring events -------------------- */
window.addEventListener('DOMContentLoaded', () => {
  $('addBtn').addEventListener('click', addTaskFromInput);
  $('taskInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTaskFromInput();
  });

  $('applyRules').addEventListener('click', applyDSL);
  $('resetRules').addEventListener('click', resetRules);

  if (!$('dslRules').value.trim()) {
    $('dslRules').value = JSON.stringify(columnRules, null, 2);
  }
});
