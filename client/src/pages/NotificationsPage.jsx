import { useCallback, useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import api from "../services/api";
import "./NotificationsPage.css";
import { socket } from "../services/socket";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingRead, setMarkingRead] = useState([]);

  const loadNotifications = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/notifications");
      const items = response.data.notifications || [];

      setNotifications(items);
      return items;
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load notifications. Please try again.",
      );
      throw err;
    }
  }, []);

  // Load notifications on mount.
  useEffect(() => {
    let cancelled = false;

    const initialLoad = async () => {
      try {
        const response = await api.get("/notifications");

        if (!cancelled) {
          setNotifications(response.data.notifications || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load notifications. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  // Receive new notifications without adding duplicates.
  useEffect(() => {
    const handleNewNotification = (notification) => {
      if (!notification?._id) return;

      setNotifications((current) => {
        if (current.some((item) => item._id === notification._id)) {
          return current;
        }

        return [notification, ...current];
      });
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, []);

  // Mark a notification as read.
  const markRead = async (id) => {
    if (markingRead.includes(id)) return;

    setError("");
    setMarkingRead((current) => [...current, id]);

    try {
      await api.patch(`/notifications/${id}/read`);

      // Update the UI immediately.
      setNotifications((current) =>
        current.map((item) =>
          item._id === id ? { ...item, isRead: true } : item,
        ),
      );

      // Notify the layout so its unread count can refresh.
      window.dispatchEvent(new Event("notifications-read"));

      // Reconcile with the server's latest data.
      await loadNotifications();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not mark notification as read. Please try again.",
      );
    } finally {
      setMarkingRead((current) => current.filter((itemId) => itemId !== id));
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
          <h1>Notifications</h1>
          <p>Keep track of your workspace updates.</p>
        </div>

        <div className="notification-summary-card">
          <span>Unread notifications</span>
          <strong>{unreadCount}</strong>
        </div>
      </section>

      {error && (
        <div className="notification-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadNotifications}>
            Retry
          </button>
        </div>
      )}

      <section className="notifications-panel">
        <div className="notifications-toolbar">
          <div>
            <h2>Your Notifications</h2>
            <p>
              {notifications.length} total · {unreadCount} unread
            </p>
          </div>

          <select
            aria-label="Filter notifications"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option>All</option>
            <option>Unread</option>
            <option>Read</option>
          </select>
        </div>

        {loading ? (
          <div className="notifications-empty" role="status">
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notifications-empty">
            <div className="notifications-empty-icon">✓</div>
            <h3>
              {filter === "All"
                ? "You're all caught up"
                : `No ${filter.toLowerCase()} notifications`}
            </h3>
            <p>Notifications matching this filter will appear here.</p>
          </div>
        ) : (
          <div className="notification-list">
            {filteredNotifications.map((item) => (
              <article
                className={`notification-item ${
                  item.isRead ? "read" : "unread"
                }`}
                key={item._id}
              >
                <div
                  className={`notification-type-icon ${(
                    item.type || ""
                  ).toLowerCase()}`}
                  aria-hidden="true"
                >
                  {iconFor(item.type)}
                </div>

                <div className="notification-item-content">
                  <div className="notification-item-heading">
                    <strong>{item.type || "Update"}</strong>
                    {!item.isRead && (
                      <span className="unread-dot" aria-label="Unread" />
                    )}
                  </div>

                  <p>{item.message}</p>

                  <time dateTime={item.createdAt}>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString()
                      : "Date unavailable"}
                  </time>
                </div>

                {!item.isRead && (
                  <button
                    type="button"
                    className="notification-read-button"
                    disabled={markingRead.includes(item._id)}
                    onClick={() => markRead(item._id)}
                  >
                    {markingRead.includes(item._id)
                      ? "Marking..."
                      : "Mark read"}
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
