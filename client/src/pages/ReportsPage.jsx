import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import api from "../services/api";
import "./ReportsPage.css";

export default function ReportsPage() {
  const [counts, setCounts] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [urgentTasks, setUrgentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReports = async () => {
      try {
        const [dashboardRes, workloadRes, urgentRes] = await Promise.all([
          api.get("/reports/dashboard"),
          api.get("/reports/workload"),
          api.get("/reports/urgent-tasks"),
        ]);

        setCounts(dashboardRes.data.counts || []);
        setWorkload(workloadRes.data.workload || []);
        setUrgentTasks(urgentRes.data.tasks || []);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load reports.");
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const totalTasks = counts.reduce((sum, item) => sum + item.count, 0);
  const completedTasks = counts
    .filter((item) => ["Completed", "Closed"].includes(item._id))
    .reduce((sum, item) => sum + item.count, 0);

  const overloadedEmployees = workload.filter((item) => item.overloaded).length;
  const maxCount = Math.max(1, ...counts.map((item) => item.count));

  const statusColors = {
    Draft: "gray",
    Open: "blue",
    Assigned: "violet",
    "In Progress": "indigo",
    Blocked: "red",
    "Pending Review": "orange",
    Completed: "green",
    Closed: "green",
  };

  return (
    <AppLayout title="Reports & Analytics">
      <section className="reports-intro">
        <div>
          {/* <span className="reports-eyebrow">INSIGHTS & PERFORMANCE</span> */}
          {/* <h1>Reports & analytics</h1> */}
          {/* <p>
            Understand task progress, team workload, and work that needs
            attention.
          </p> */}
        </div>
        <button
          className="reports-refresh"
          onClick={() => window.location.reload()}
        >
          ↻ Refresh reports
        </button>
      </section>

      {error && <div className="reports-error">{error}</div>}

      <div className="reports-summary-grid">
        <article className="reports-summary-card">
          <span>Total visible tasks</span>
          <strong>{loading ? "—" : totalTasks}</strong>
          {/* <small>Across your accessible workspace</small> */}
        </article>
        <article className="reports-summary-card">
          <span>Completed or closed</span>
          <strong>{loading ? "—" : completedTasks}</strong>
          {/* <small>Tasks at the end of the workflow</small> */}
        </article>
        <article className="reports-summary-card">
          <span>Urgent tasks</span>
          <strong>{loading ? "—" : urgentTasks.length}</strong>
          {/* <small>Open tasks ordered by urgency</small> */}
        </article>
        <article className="reports-summary-card warning">
          <span>Overloaded employees</span>
          <strong>{loading ? "—" : overloadedEmployees}</strong>
          {/* <small>Estimated open work exceeds 40 hours</small> */}
        </article>
      </div>

      <div className="reports-main-grid">
        <section className="reports-panel">
          <div className="reports-panel-heading">
            <div>
              <h2>Tasks by status</h2>
              {/* <p>Distribution of visible tasks across workflow stages.</p> */}
            </div>
          </div>

          {loading ? (
            <p className="reports-empty">Loading status report...</p>
          ) : counts.length === 0 ? (
            <p className="reports-empty">No task data is available yet.</p>
          ) : (
            <div className="reports-status-list">
              {counts.map((item) => (
                <div className="reports-status-row" key={item._id}>
                  <div className="reports-status-label">
                    <span
                      className={`reports-status-dot ${statusColors[item._id] || "gray"}`}
                    />
                    <span>{item._id}</span>
                    <strong>{item.count}</strong>
                  </div>
                  <div className="reports-bar-track">
                    <div
                      className={`reports-bar-fill ${statusColors[item._id] || "gray"}`}
                      style={{ width: `${(item.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="reports-panel">
          <div className="reports-panel-heading">
            <div>
              <h2>Workload overview</h2>
              {/* <p>Estimated hours for open tasks by employee.</p> */}
            </div>
          </div>

          {loading ? (
            <p className="reports-empty">Loading workload...</p>
          ) : workload.length === 0 ? (
            <p className="reports-empty">
              No employee workload data available.
            </p>
          ) : (
            <div className="reports-workload-list">
              {workload.map((member) => (
                <div className="reports-workload-row" key={member.employeeId}>
                  <div className="reports-workload-top">
                    <div className="reports-employee">
                      <span className="reports-avatar">
                        {member.name?.charAt(0).toUpperCase() || "U"}
                      </span>
                      <div>
                        <strong>{member.name}</strong>
                        <span>{member.estimatedHours} estimated hours</span>
                      </div>
                    </div>
                    <span
                      className={`reports-load-badge ${
                        member.overloaded ? "overloaded" : "normal"
                      }`}
                    >
                      {member.overloaded ? "Overloaded" : "Normal"}
                    </span>
                  </div>
                  <div className="reports-bar-track">
                    <div
                      className={`reports-bar-fill ${
                        member.overloaded ? "red" : "violet"
                      }`}
                      style={{
                        width: `${Math.min(
                          (member.estimatedHours / 40) * 100,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="reports-footnote">
            {/* 40 hours is the assignment's workload threshold. */}
          </p>
        </section>
      </div>

      <section className="reports-panel reports-urgent-panel">
        <div className="reports-panel-heading">
          <div>
            <h2>Urgent tasks</h2>
            {/* <p>Open tasks ranked by the backend urgency score.</p> */}
          </div>
          <span className="reports-table-count">
            {urgentTasks.length} tasks
          </span>
        </div>

        {loading ? (
          <p className="reports-empty">Loading urgent tasks...</p>
        ) : urgentTasks.length === 0 ? (
          <p className="reports-empty">No active tasks need attention.</p>
        ) : (
          <div className="reports-table-wrap">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due date</th>
                  <th>Urgency score</th>
                </tr>
              </thead>
              <tbody>
                {urgentTasks.slice(0, 10).map((task) => (
                  <tr key={task._id}>
                    <td>
                      <strong>{task.title}</strong>
                      <small>{task.estimatedHours || 0} estimated hrs</small>
                    </td>
                    <td>
                      <span
                        className={`priority-badge ${(task.priority || "Medium").toLowerCase()}`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td>{task.status}</td>
                    <td>
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString()
                        : "No deadline"}
                    </td>
                    <td>
                      <strong className="urgency-score">
                        {Number(task.urgencyScore || 0).toFixed(2)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
