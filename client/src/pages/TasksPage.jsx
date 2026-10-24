import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./TasksPage.css";

const initialForm = {
  title: "",
  description: "",
  project: "",
  assignedTo: "",
  priority: "Medium",
  dueDate: "",
  estimatedHours: "1",
  tags: "",
  dependsOn: [],
};

const statuses = [
  "Draft",
  "Open",
  "Assigned",
  "In Progress",
  "Blocked",
  "Pending Review",
  "Completed",
  "Closed",
];

export default function TasksPage() {
  const { user } = useAuth();
  const canAssign = ["Admin", "Manager"].includes(user?.role);

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
    overdue: false,
  });

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uploadingTaskId, setUploadingTaskId] = useState("");

  const loadTasks = async (params = {}) => {
    const response = await api.get("/tasks", {
      params: { page: 1, limit: 10, ...params },
    });

    setTasks(response.data.tasks || []);

    if (response.data.pagination) {
      setPagination(response.data.pagination);
    }
  };

  const loadWorkspace = async () => {
    setLoading(true);
    setError("");

    try {
      const requests = [
        api.get("/tasks", { params: { page: 1, limit: 10 } }),
        api.get("/projects"),
        api.get("/users"),
      ];

      const results = await Promise.all(requests);

      setTasks(results[0].data.tasks || []);
      if (results[0].data.pagination) {
        setPagination(results[0].data.pagination);
      }
      setProjects(results[1].data.projects || []);

      setUsers(results[2].data.users || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load tasks. Please refresh and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const getFilterParams = () => {
    const params = {};

    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.overdue) params.overdue = "true";

    return params;
  };

  const availableDependencies = tasks.filter(
    (task) =>
      task._id !== undefined &&
      task.project &&
      task.project._id === form.project,
  );

  const handleFilter = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const params = {};

      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.overdue) params.overdue = "true";

      await loadTasks(params);
    } catch (err) {
      setError(err.response?.data?.message || "Could not filter tasks.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const emptyFilters = {
      search: "",
      status: "",
      priority: "",
      overdue: false,
    };

    setFilters(emptyFilters);
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await loadTasks();
    } catch {
      setError("Could not reload tasks.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        estimatedHours: Number(form.estimatedHours || 0),
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        dependsOn: form.dependsOn,
      };

      if (form.project) payload.project = form.project;
      if (canAssign || user?.role === "Employee") {
        if (form.assignedTo) {
          payload.assignedTo = form.assignedTo;
        }
      }
      if (form.dueDate) {
        payload.dueDate = new Date(form.dueDate).toISOString();
      }

      await api.post("/tasks", payload);

      setForm(initialForm);
      setShowForm(false);
      setMessage("Task created successfully.");
      await loadTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create the task.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (task, status) => {
    setError("");
    setMessage("");

    try {
      await api.patch(`/tasks/${task._id}`, { status });
      setMessage(`Task "${task.title}" updated.`);
      await loadTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update task status.");
    }
  };

  const handleReview = async (task, action) => {
    let reason = "";

    if (action === "reopen") {
      reason = window.prompt("Enter the reason for reopening this task:") || "";

      if (!reason.trim()) {
        setError("A reason is required to reopen a task.");
        return;
      }
    }

    setError("");
    setMessage("");

    try {
      await api.patch(`/tasks/${task._id}/review`, {
        action,
        ...(action === "reopen" ? { reason: reason.trim() } : {}),
      });

      setMessage(
        action === "approve"
          ? "Task approved and closed."
          : "Task reopened successfully.",
      );

      await loadTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Could not review the task.");
    }
  };

  const getProjectName = (task) =>
    typeof task.project === "object"
      ? task.project?.name || "Personal task"
      : projects.find((project) => project._id === task.project)?.name ||
        "Personal task";

  const handleProgressUpdate = async (task) => {
    const value = window.prompt(
      "Enter progress percentage (0–100):",
      String(task.progress ?? 0),
    );

    if (value === null) return;

    const progress = Number(value);

    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
      setError("Progress must be a whole number from 0 to 100.");
      return;
    }

    const remarks = window.prompt("Add progress remarks:", task.remarks || "");

    if (remarks === null) return;

    try {
      await api.patch(`/tasks/${task._id}`, { progress, remarks });
      setMessage("Task progress updated.");
      await loadTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update progress.");
    }
  };

  const handleEditTask = async (task) => {
    const title = window.prompt("Task title:", task.title);
    if (title === null) return;

    const description = window.prompt(
      "Task description:",
      task.description || "",
    );
    if (description === null) return;

    const priority = window.prompt(
      "Priority (Low, Medium, High, Critical):",
      task.priority,
    );
    if (priority === null) return;

    if (!["Low", "Medium", "High", "Critical"].includes(priority)) {
      setError("Please enter a valid priority.");
      return;
    }

    try {
      await api.patch(`/tasks/${task._id}`, {
        title: title.trim(),
        description: description.trim(),
        priority,
      });

      setMessage("Task details updated successfully.");
      await loadTasks({
        ...getFilterParams(),
        page: pagination.page,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Could not edit the task.");
    }
  };

  const handleLogTime = async (task) => {
    const value = window.prompt("Hours worked (e.g. 1.5):");
    if (value === null) return;

    const hours = Number(value);

    if (!Number.isFinite(hours) || hours <= 0) {
      setError("Enter a valid number of hours greater than zero.");
      return;
    }

    const remarks = window.prompt("Describe the work completed:", "");
    if (remarks === null) return;

    try {
      await api.post(`/tasks/${task._id}/time-entries`, {
        hours,
        remarks,
      });

      setMessage("Work time logged successfully.");
      await loadTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to log work time.");
    }
  };

  const handleAssignmentReview = async (task, action) => {
    let reason = "";

    if (action === "reject") {
      reason =
        window.prompt("Enter the reason for rejecting this assignment:") || "";

      if (!reason.trim()) {
        setError("A rejection reason is required.");
        return;
      }
    }

    setError("");
    setMessage("");

    try {
      await api.patch(`/tasks/${task._id}/assignment-review`, {
        action,
        ...(action === "reject" ? { reason: reason.trim() } : {}),
      });

      setMessage(
        action === "approve"
          ? "Task assignment approved."
          : "Task assignment rejected.",
      );

      await loadTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to review assignment.");
    }
  };

  const handleReassign = async (task) => {
    const employees = users.filter(
      (item) => item.role === "Employee" && item.isActive !== false,
    );

    const employeeList = employees
      .map((item) => `${item.name} (${item.email})`)
      .join("\n");

    const email = window.prompt(
      `Enter the new assignee's email:\n${employeeList}`,
    );

    if (!email) return;

    const selectedEmployee = employees.find(
      (item) => item.email.toLowerCase() === email.trim().toLowerCase(),
    );

    if (!selectedEmployee) {
      setError("Please enter a valid employee email.");
      return;
    }

    try {
      await api.patch(`/tasks/${task._id}`, {
        assignedTo: selectedEmployee._id,
      });

      setMessage(`Task reassigned to ${selectedEmployee.name}.`);
      await loadTasks({
        ...getFilterParams(),
        page: pagination.page,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Could not reassign the task.");
    }
  };

  const getActions = (task) => {
    const actions = [];

    if (user?.role === "Employee" && task.assignedTo?._id === user?._id) {
      if (["Assigned", "Open"].includes(task.status)) {
        actions.push(
          <button
            key="start"
            className="task-action primary"
            title="Start task"
            aria-label="Start task"
            onClick={() => handleStatus(task, "In Progress")}
          >
            ▶
          </button>,
        );
      }

      if (task.status === "In Progress") {
        actions.push(
          <button
            key="progress"
            className="task-action secondary"
            title="Update progress"
            aria-label="Update progress"
            onClick={() => handleProgressUpdate(task)}
          >
            ✎
          </button>,
          <button
            key="complete"
            className="task-action primary"
            title="Complete task"
            aria-label="Complete task"
            onClick={() => handleStatus(task, "Completed")}
          >
            ✓
          </button>,
          <button
            key="time"
            className="task-action secondary"
            title="Log time"
            aria-label="Log time"
            onClick={() => handleLogTime(task)}
          >
            ⏱
          </button>,
        );
      }
    }

    if (canAssign && task.status === "Pending Review") {
      actions.push(
        <button
          key="approve"
          className="task-action primary"
          title="Approve completed task"
          aria-label="Approve completed task"
          onClick={() => handleReview(task, "approve")}
        >
          ✓
        </button>,
        <button
          key="reopen"
          className="task-action secondary"
          title="Reopen task"
          aria-label="Reopen task"
          onClick={() => handleReview(task, "reopen")}
        >
          ↶
        </button>,
      );
    }

    if (
      canAssign &&
      task.status === "Draft" &&
      task.approvalStatus === "Pending"
    ) {
      actions.push(
        <button
          key="approve-assignment"
          className="task-action primary"
          title="Approve assignment"
          aria-label="Approve assignment"
          onClick={() => handleAssignmentReview(task, "approve")}
        >
          ✓
        </button>,
        <button
          key="reject-assignment"
          className="task-action secondary"
          title="Reject assignment"
          aria-label="Reject assignment"
          onClick={() => handleAssignmentReview(task, "reject")}
        >
          ✕
        </button>,
      );
    }

    if (canAssign && !["Closed", "Completed"].includes(task.status)) {
      actions.push(
        <button
          key="reassign"
          className="task-action secondary"
          title="Reassign task"
          aria-label="Reassign task"
          onClick={() => handleReassign(task)}
        >
          ⇄
        </button>,
      );
    }

    const canEdit =
      canAssign ||
      task.assignedTo?._id === user?._id ||
      (task.assignedBy?._id === user?._id && task.status === "Draft");

    if (canEdit && !["Closed", "Completed"].includes(task.status)) {
      actions.push(
        <button
          key="edit"
          className="task-action secondary"
          title="Edit task"
          aria-label="Edit task"
          onClick={() => handleEditTask(task)}
        >
          ✎
        </button>,
      );
    }

    return actions;
  };

  const activeCount = tasks.filter(
    (task) => !["Completed", "Closed"].includes(task.status),
  ).length;

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const handleAttachmentUpload = async (task, fileList) => {
    const files = Array.from(fileList || []);

    if (!files.length) return;

    if (files.length > 5) {
      setError("You can upload a maximum of 5 files at once.");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("attachments", file));

    setError("");
    setMessage("");
    setUploadingTaskId(task._id);

    try {
      await api.post(`/tasks/${task._id}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage("Attachments uploaded successfully.");
      await loadTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploadingTaskId("");
    }
  };

  return (
    <AppLayout title="Tasks">
      <section className="tasks-intro">
        <div>
          {/* <span className="tasks-eyebrow">TASK MANAGEMENT</span> */}
          {/* <h1>Tasks workspace</h1> */}
          {/* <p>Organize priorities, track deadlines, and keep work moving.</p> */}
        </div>

        <button
          className="create-task-button"
          onClick={() => {
            setError("");
            setMessage("");
            setShowForm((current) => !current);
          }}
        >
          {showForm ? "Close form" : "+ Create task"}
        </button>
      </section>

      <div className="task-metrics">
        <div className="task-metric-card">
          <span>Total tasks</span>
          <strong>{tasks.length}</strong>
        </div>
        <div className="task-metric-card">
          <span>Active tasks</span>
          <strong>{activeCount}</strong>
        </div>
        <div className="task-metric-card">
          <span>Awaiting review</span>
          <strong>
            {tasks.filter((t) => t.status === "Pending Review").length}
          </strong>
        </div>
        <div className="task-metric-card">
          <span>Overdue</span>
          <strong className="overdue-value">
            {tasks.filter((t) => t.isOverdue).length}
          </strong>
        </div>
      </div>

      {error && <div className="task-feedback error">{error}</div>}
      {message && <div className="task-feedback success">{message}</div>}

      {showForm && (
        <section className="tasks-panel create-task-panel">
          <div className="tasks-panel-heading">
            <div>
              <h2>Create a task</h2>
              <p>
                {canAssign
                  ? "Assign work to an employee in your project."
                  : "Create a personal task or a task linked to a project."}
              </p>
            </div>
          </div>

          <form className="task-form" onSubmit={handleCreate}>
            <div className="task-form-field full">
              <label htmlFor="task-title">Task title *</label>
              <input
                id="task-title"
                maxLength={150}
                required
                value={form.title}
                onChange={(e) => updateForm("title", e.target.value)}
                placeholder="e.g. Build dashboard overview"
              />
            </div>

            <div className="task-form-field full">
              <label htmlFor="task-description">Description</label>
              <textarea
                id="task-description"
                rows={3}
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                placeholder="Describe the task and expected outcome..."
              />
            </div>

            <div className="task-form-field">
              <label htmlFor="task-project">
                Project {canAssign ? "*" : "(optional)"}
              </label>
              <select
                id="task-project"
                required={canAssign}
                value={form.project}
                onChange={(e) => {
                  updateForm("project", e.target.value);
                  updateForm("dependsOn", []);
                }}
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {(canAssign || user?.role === "Employee") && (
              <div className="task-form-field">
                <label htmlFor="task-assignee">Assign to employee *</label>
                <select
                  id="task-assignee"
                  required
                  value={form.assignedTo}
                  onChange={(e) => updateForm("assignedTo", e.target.value)}
                >
                  <option value="">Select employee</option>
                  {users
                    .filter(
                      (item) =>
                        item.role === "Employee" &&
                        item.isActive !== false &&
                        (user?.role !== "Employee" || item._id !== user?._id),
                    )
                    .map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name} ({item.email})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="task-form-field">
              <label htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                value={form.priority}
                onChange={(e) => updateForm("priority", e.target.value)}
              >
                {["Low", "Medium", "High", "Critical"].map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
            </div>

            <div className="task-form-field">
              <label htmlFor="task-due-date">Due date</label>
              <input
                id="task-due-date"
                type="datetime-local"
                value={form.dueDate}
                onChange={(e) => updateForm("dueDate", e.target.value)}
              />
            </div>

            <div className="task-form-field">
              <label htmlFor="task-hours">Estimated hours</label>
              <input
                id="task-hours"
                type="number"
                min="0"
                step="0.5"
                value={form.estimatedHours}
                onChange={(e) => updateForm("estimatedHours", e.target.value)}
              />
            </div>

            <div className="task-form-field">
              <label htmlFor="task-tags">Tags</label>
              <input
                id="task-tags"
                value={form.tags}
                onChange={(e) => updateForm("tags", e.target.value)}
                placeholder="frontend, urgent, sprint-1"
              />
            </div>

            {form.project && availableDependencies.length > 0 && (
              <div className="task-form-field full">
                <label htmlFor="task-dependencies">Depends on (optional)</label>
                <select
                  id="task-dependencies"
                  multiple
                  value={form.dependsOn}
                  onChange={(e) =>
                    updateForm(
                      "dependsOn",
                      Array.from(
                        e.target.selectedOptions,
                        (option) => option.value,
                      ),
                    )
                  }
                >
                  {availableDependencies.map((task) => (
                    <option key={task._id} value={task._id}>
                      {task.title} — {task.status}
                    </option>
                  ))}
                </select>
                <small>
                  Use Ctrl (Windows) to select multiple dependencies.
                </small>
              </div>
            )}

            <div className="task-form-actions full">
              <button
                className="task-action secondary"
                type="button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                className="task-action primary"
                type="submit"
                disabled={saving}
              >
                {saving ? "Creating..." : "Create task"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="tasks-panel">
        <div className="tasks-panel-heading">
          <div>
            <h2>All tasks</h2>
            <p>
              {/* Search tasks and filter the list by status, priority, or deadline. */}
            </p>
          </div>
          <span className="task-result-count">{tasks.length} shown</span>
        </div>

        <form className="task-filter-form" onSubmit={handleFilter}>
          <input
            aria-label="Search tasks"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search by task title or description..."
          />

          <select
            aria-label="Filter by status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>

          <select
            aria-label="Filter by priority"
            value={filters.priority}
            onChange={(e) =>
              setFilters({ ...filters, priority: e.target.value })
            }
          >
            <option value="">All priorities</option>
            {["Low", "Medium", "High", "Critical"].map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </select>

          <label className="overdue-filter">
            <input
              type="checkbox"
              checked={filters.overdue}
              onChange={(e) =>
                setFilters({ ...filters, overdue: e.target.checked })
              }
            />
            Overdue only
          </label>

          <button className="task-action primary" type="submit">
            Apply
          </button>
          <button
            className="task-action secondary"
            type="button"
            onClick={handleReset}
          >
            Reset
          </button>
        </form>

        {loading ? (
          <div className="tasks-empty">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="tasks-empty">
            <div className="empty-task-icon">✓</div>
            <h3>No tasks found</h3>
            <p>Try another filter or create a new task.</p>
          </div>
        ) : (
          <div className="tasks-table-wrap">
            <table className="tasks-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Assignee</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due date</th>
                  <th>Attachments</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task._id}>
                    <td>
                      <div className="task-table-title">{task.title}</div>
                      <div className="task-table-subtitle">
                        {task.estimatedHours ?? 0}h estimated ·{" "}
                        {task.actualHours ?? 0}h logged · {task.progress ?? 0}%
                        complete
                      </div>
                    </td>
                    <td>{getProjectName(task)}</td>
                    <td>{task.assignedTo?.name || "Unassigned"}</td>
                    <td>
                      <span
                        className={`priority-badge ${(task.priority || "Medium").toLowerCase()}`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`task-status-badge ${task.status.toLowerCase().replaceAll(" ", "-")}`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td>
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString()
                        : "—"}
                      {task.isOverdue && (
                        <span className="task-overdue-label">Overdue</span>
                      )}
                    </td>
                    <td>
                      <div className="task-attachment-cell">
                        {(task.attachments || []).map((path) => (
                          <a
                            key={path}
                            href={`http://localhost:5000${path}`}
                            target="_blank"
                            rel="noreferrer"
                            className="task-attachment-link"
                          >
                            📎 {path.split("/").pop().slice(0, 16)}
                          </a>
                        ))}

                        <label className="task-action secondary task-upload-label">
                          + Attach
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
                            onChange={(e) => {
                              handleAttachmentUpload(task, e.target.files);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </td>
                    <td>
                      <div className="task-row-actions">{getActions(task)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="tasks-pagination">
              <span>
                Page {pagination.page} of {Math.max(1, pagination.totalPages)}
                {" · "}
                {pagination.total} total tasks
              </span>

              <div>
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    loadTasks({
                      ...getFilterParams(),
                      page: pagination.page - 1,
                    })
                  }
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    loadTasks({
                      ...getFilterParams(),
                      page: pagination.page + 1,
                    })
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
