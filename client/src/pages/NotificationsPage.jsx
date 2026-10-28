import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import api from "../services/api";
import "./NotificationsPage.css";
import { socket } from "../services/socket";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = async () => {
    const response = await api.get("/notifications");
    setNotifications(response.data.notifications || []);
  };

  useEffect(() => {
    loadNotifications()
      .catch((err) =>
        setError(
          err.response?.data?.message || "Unable to load notifications.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleNewNotification = (notification) => {
      if (!notification?._id) return;

      setNotifications((current) => {
        const alreadyExists = current.some(
          (item) => item._id === notification._id,
        );

        if (alreadyExists) return current;

        return [notification, ...current];
      });
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, []);

  const markRead = async (id) => {
    setError("");

    try {
      await api.patch(`/notifications/${id}/read`);
      window.dispatchEvent(new Event("notifications-read"));
      await loadNotifications();
    } catch (err) {
      setError(err.response?.data?.message || "Could not mark as read.");
    }
  };

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const filteredNotifications = notifications.filter((item) => {
    if (filter === "Unread") return !item.isRead;
    if (filter === "Read") return item.isRead;
    return true;
  });

  const iconFor = (type) => {
    const icons = {
      Assignment: "↗",
      Status: "✓",
      Reminder: "◷",
      Overdue: "!",
    };

    return icons[type] || "•";
  };

  return (
    <AppLayout title="Notifications">
      <section className="notifications-intro">
        <div>
          {/* <span className="notifications-eyebrow">YOUR UPDATES</span> */}
          {/* <h1>Notifications</h1> */}
          {/* <p>Stay informed about assignments, deadlines, and task progress.</p> */}
        </div>

        <div className="notification-summary-card">
          <span>Unread notifications</span>
          <strong>{unreadCount}</strong>
        </div>
      </section>

      {error && <div className="notification-error">{error}</div>}

      <section className="notifications-panel">
        <div className="notifications-toolbar">
          <div>
            <h2>Your Notifications</h2>
            {/* <p>Updates from your workspace.</p> */}
          </div>

          <select
            aria-label="Filter notifications"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>All</option>
            <option>Unread</option>
            <option>Read</option>
          </select>
        </div>

        {loading ? (
          <div className="notifications-empty">Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notifications-empty">
            <div className="notifications-empty-icon">✓</div>
            <h3>You're all caught up</h3>
            <p>Notifications for this filter will appear here.</p>
          </div>
        ) : (
          <div className="notification-list">
            {filteredNotifications.map((item) => (
              <article
                className={`notification-item ${item.isRead ? "read" : "unread"}`}
                key={item._id}
              >
                <div
                  className={`notification-type-icon ${(item.type || "").toLowerCase()}`}
                >
                  {iconFor(item.type)}
                </div>

                <div className="notification-item-content">
                  <div className="notification-item-heading">
                    <strong>{item.type || "Update"}</strong>
                    {!item.isRead && <span className="unread-dot" />}
                  </div>

                  <p>{item.message}</p>

                  <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleString()}
                  </time>
                </div>

                {!item.isRead && (
                  <button
                    className="notification-read-button"
                    onClick={() => markRead(item._id)}
                  >
                    Mark read
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
}
