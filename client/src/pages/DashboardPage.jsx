import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import api from "../services/api";
import "./DashboardPage.css";

export default function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [counts, setCounts] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [taskRes, reportRes, workloadRes, notificationRes] =
          await Promise.all([
            api.get("/tasks"),
            api.get("/reports/dashboard"),
            api.get("/reports/workload"),
            api.get("/notifications"),
          ]);

        setTasks(taskRes.data.tasks || []);
        setCounts(reportRes.data.counts || []);
        setWorkload(workloadRes.data.workload || []);
        setNotifications(notificationRes.data.notifications || []);
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load dashboard data.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const countStatus = (status) =>
    counts.find((item) => item._id === status)?.count || 0;

  const activeTasks = tasks.filter(
    (task) => !["Completed", "Closed"].includes(task.status),
  );

  const overdueTasks = tasks.filter((task) => task.isOverdue);
  const unreadNotifications = notifications.filter((n) => !n.isRead).length;

  const myWorkload = workload.find((item) => item.employeeId === user?._id);

  const stats = [
    {
      label: "Total tasks",
      value: tasks.length,
      // note: "Tasks you can access",
      icon: "▦",
      color: "violet",
    },
    {
      label: "In progress",
      value: countStatus("In Progress"),
      // note: "Currently being worked on",
      icon: "↗",
      color: "blue",
    },
    {
      label: "Pending review",
      value: countStatus("Pending Review"),
      // note: "Waiting for approval",
      icon: "◷",
      color: "orange",
    },
    {
      label: "Overdue tasks",
      value: overdueTasks.length,
      // note: "Past their due date",
      icon: "!",
      color: "red",
    },
  ];

  return (
    <AppLayout ti tle="Overview">
      <section className="welcome-section">
        <div>
          {/* <span className="eyebrow">YOUR WORKSPACE</span> */}
          <h1>Welcome back, {user?.name?.split(" ")[0] || "there"} 👋</h1>
        </div>
        <div className="welcome-date">
          <span>YOUR ROLE</span>
          <strong>{user?.role}</strong>
        </div>
      </section>

      {error && <div className="alert alert-danger">{error}</div>}

      {overdueTasks.length > 0 && (
        <div className="dashboard-alert">
          <span className="alert-symbol">!</span>
          <div>
            <strong>
              {overdueTasks.length} overdue task(s) need attention
            </strong>
            <p>Review the deadlines and update your team's priorities.</p>
          </div>
        </div>
      )}

      <div className="dashboard-section-heading">
        <div>
          {/* <h2>Workspace overview</h2>
          <p>Track progress and keep your work moving.</p> */}
        </div>
        <span className="live-indicator">LIVE DATA</span>
      </div>

      <div className="dashboard-stats">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <div className="stat-card-header">
              <div className={`stat-icon ${stat.color}`}>{stat.icon}</div>

              <div className="stat-label">{stat.label}</div>
            </div>

            <div className="stat-value">{loading ? "—" : stat.value}</div>
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-panel task-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent tasks</h2>
            </div>
            <a href="/tasks" className="panel-link">
              View all →
            </a>
          </div>

          {loading ? (
            <p className="empty-state">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="empty-state">No tasks found yet.</p>
          ) : (
            <div className="dashboard-task-list">
              {tasks.slice(0, 6).map((task) => (
                <div className="dashboard-task-row" key={task._id}>
                  <div className="task-main">
                    <span className="task-mini-icon">✓</span>
                    <div className="task-text">
                      <strong>{task.title}</strong>
                      <span>
                        {task.project?.name || "Personal task"} ·{" "}
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString()
                          : "No deadline"}
                      </span>
                    </div>
                  </div>
                  <div className="task-badges">
                    <span
                      className={`priority-badge ${(task.priority || "Medium").toLowerCase()}`}
                    >
                      {task.priority}
                    </span>
                    <span className="status-text">{task.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="dashboard-side-column">
          <section className="dashboard-panel">
            <div className="panel-heading">
              <div>
                <h2>My workload</h2>
              </div>
              <span className="side-panel-icon">◷</span>
            </div>

            <div className="workload-number">
              {loading ? "—" : (myWorkload?.estimatedHours ?? 0)}
              <span> hrs</span>
            </div>

            <div className="workload-track">
              <div
                className={`workload-fill ${
                  myWorkload?.overloaded ? "overloaded" : ""
                }`}
                style={{
                  width: `${Math.min(
                    ((myWorkload?.estimatedHours || 0) / 40) * 100,
                    100,
                  )}%`,
                }}
              />
            </div>

            <div className="workload-footer">
              {/* <span>0 hrs</span> */}
              {/* <span>40 hrs capacity reference</span> */}
            </div>

            {myWorkload?.overloaded && (
              <p className="workload-warning">
                {/* Your estimated workload exceeds 40 hours. */}
              </p>
            )}
          </section>

          <section className="dashboard-panel notification-summary">
            <div className="panel-heading">
              <div>
                <h2>Notifications</h2>
                {/* <p>Keep track of updates.</p> */}
              </div>
              <span className="notification-count">{unreadNotifications}</span>
            </div>
            <p className="notification-description">
              {unreadNotifications
                ? `You have ${unreadNotifications} unread notification(s).`
                : "You're all caught up."}
            </p>
            <a href="/notifications" className="panel-link">
              Open notifications →
            </a>
          </section>

          <section className="dashboard-panel">
            <h2 className="status-heading">Task status</h2>
            {[
              "Assigned",
              "In Progress",
              "Blocked",
              "Pending Review",
              "Closed",
            ].map((status) => (
              <div className="status-summary-row" key={status}>
                <span>{status}</span>
                <strong>{countStatus(status)}</strong>
              </div>
            ))}
          </section>
        </aside>
      </div>

      {activeTasks.length > 0 && (
        <p className="dashboard-footer-note">
          You have <strong>{activeTasks.length}</strong> active task(s) across
          your accessible workspace.
        </p>
      )}
    </AppLayout>
  );
}
