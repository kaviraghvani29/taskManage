import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import api from "../services/api";
import "./ActivityPage.css";

export default function ActivityPage() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/tasks")
      .then((response) => {
        const list = response.data.tasks || [];
        setTasks(list);
        if (list.length) setSelectedTask(list[0]._id);
      })
      .catch((err) =>
        setError(err.response?.data?.message || "Unable to load tasks."),
      )
      .finally(() => setLoadingTasks(false));
  }, []);

  useEffect(() => {
    if (!selectedTask) {
      setHistory([]);
      return;
    }

    let cancelled = false;
    setLoadingHistory(true);
    setError("");

    api
      .get(`/task-history/${selectedTask}`)
      .then((response) => {
        if (!cancelled) setHistory(response.data.history || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Unable to load task history.",
          );
          setHistory([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTask]);

  const formatValue = (value) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <AppLayout title="Activity History">
      <section className="activity-intro">
        <div>
          {/* <span className="activity-eyebrow">AUDIT TRAIL</span>
          <h1>Activity history</h1>
          <p>Follow task changes, status transitions, and review decisions.</p> */}
        </div>
        <div className="activity-total">
          <span>Recorded changes</span>
          <strong>{history.length}</strong>
        </div>
      </section>

      {error && <div className="activity-error">{error}</div>}

      <section className="activity-panel">
        <div className="activity-toolbar">
          <div>
            <h2>Task audit trail</h2>
            {/* <p>Select a task to inspect its recorded changes.</p> */}
          </div>

          <select
            aria-label="Select task for history"
            value={selectedTask}
            disabled={loadingTasks || tasks.length === 0}
            onChange={(e) => setSelectedTask(e.target.value)}
          >
            {loadingTasks && <option value="">Loading tasks...</option>}
            {!loadingTasks && tasks.length === 0 && (
              <option value="">No tasks available</option>
            )}
            {tasks.map((task) => (
              <option key={task._id} value={task._id}>
                {task.title}
              </option>
            ))}
          </select>
        </div>

        {loadingHistory ? (
          <div className="activity-empty">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="activity-empty">
            <div className="activity-empty-icon">↻</div>
            <h3>No history records</h3>
            <p>Changes recorded for this task will appear here.</p>
          </div>
        ) : (
          <div className="activity-timeline">
            {history.map((item) => (
              <article className="activity-entry" key={item._id}>
                <div className="activity-marker">↻</div>
                <div className="activity-entry-body">
                  <div className="activity-entry-top">
                    <strong>{item.changedBy?.name || "Unknown user"}</strong>
                    <time dateTime={item.timestamp}>
                      {new Date(item.timestamp).toLocaleString()}
                    </time>
                  </div>

                  <p className="activity-description">
                    Updated <strong>{item.field}</strong>
                  </p>

                  <div className="activity-change">
                    <div>
                      <span>Previous value</span>
                      <p>{formatValue(item.oldValue)}</p>
                    </div>
                    <div className="activity-change-arrow">→</div>
                    <div>
                      <span>New value</span>
                      <p>{formatValue(item.newValue)}</p>
                    </div>
                  </div>

                  {item.changedBy?.role && (
                    <span className="activity-role">{item.changedBy.role}</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
}
