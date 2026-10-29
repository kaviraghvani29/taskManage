import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { socket } from "../services/socket";
import "./AppLayout.css";

const navigation = [
  {
    label: "Overview",
    path: "/dashboard",
    icon: "▦",
    roles: ["Admin", "Manager", "Employee"],
  },
  {
    label: "Tasks",
    path: "/tasks",
    icon: "✓",
    roles: ["Admin", "Manager", "Employee"],
  },
  {
    label: "Projects",
    path: "/projects",
    icon: "◫",
    roles: ["Admin", "Manager", "Employee"],
  },
  {
    label: "Team",
    path: "/team",
    icon: "♧",
    roles: ["Admin", "Manager"],
  },
  {
    label: "Notifications",
    path: "/notifications",
    icon: "♧",
    roles: ["Admin", "Manager", "Employee"],
  },
  {
    label: "Reports",
    path: "/reports",
    icon: "▤",
    roles: ["Admin", "Manager", "Employee"],
  },
  {
    label: "Activity History",
    path: "/activity",
    icon: "↻",
    roles: ["Admin", "Manager", "Employee"],
  },
];

export default function AppLayout({ children, title = "Overview" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [bellOpen, setBellOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [recentNotifications, setRecentNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");

  const [loggingOut, setLoggingOut] = useState(false);

  const bellRef = useRef(null);
  const settingsRef = useRef(null);
  const seenNotificationIds = useRef(new Set());

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("taskflow-theme") === "dark",
  );

  // Apply the theme and remember the user's preference.
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light",
    );

    localStorage.setItem("taskflow-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Fetch the unread notification count.
  useEffect(() => {
    if (!user?._id) return;

    let cancelled = false;

    const loadUnreadCount = async () => {
      try {
        const response = await api.get("/notifications");
        const items = response.data.notifications || [];

        if (!cancelled) {
          setUnreadCount(items.filter((item) => !item.isRead).length);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load unread notification count", error);
        }
      }
    };

    const handleNewNotification = (notification) => {
      if (
        !notification?._id ||
        notification.isRead ||
        seenNotificationIds.current.has(notification._id)
      ) {
        return;
      }

      seenNotificationIds.current.add(notification._id);

      setUnreadCount((count) => count + 1);

      // Update the open popup immediately for new notifications.
      setRecentNotifications((items) => {
        if (items.some((item) => item._id === notification._id)) {
          return items;
        }

        return [notification, ...items].slice(0, 5);
      });
    };

    loadUnreadCount();
    socket.on("notification:new", handleNewNotification);
    window.addEventListener("notifications-read", loadUnreadCount);

    return () => {
      cancelled = true;
      socket.off("notification:new", handleNewNotification);
      window.removeEventListener("notifications-read", loadUnreadCount);
    };
  }, [user?._id]);

  // Load notifications when the bell opens.
  useEffect(() => {
    if (!bellOpen || !user?._id) return;

    let cancelled = false;

    const loadRecentNotifications = async () => {
      setNotificationsLoading(true);
      setNotificationError("");

      try {
        const response = await api.get("/notifications");
        const items = response.data.notifications || [];

        if (cancelled) return;

        setRecentNotifications(items.slice(0, 5));
        setUnreadCount(items.filter((item) => !item.isRead).length);

        items.forEach((item) => {
          seenNotificationIds.current.add(item._id);
        });
      } catch (error) {
        if (!cancelled) {
          setNotificationError(
            error.response?.data?.message ||
              "Unable to load notifications. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setNotificationsLoading(false);
        }
      }
    };

    loadRecentNotifications();

    return () => {
      cancelled = true;
    };
  }, [bellOpen, user?._id]);

  // Close both dropdowns on outside click or Escape.
  useEffect(() => {
    if (!bellOpen && !settingsOpen) return;

    const handleOutsideClick = (event) => {
      if (bellOpen && !bellRef.current?.contains(event.target)) {
        setBellOpen(false);
      }

      if (settingsOpen && !settingsRef.current?.contains(event.target)) {
        setSettingsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setBellOpen(false);
        setSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [bellOpen, settingsOpen]);

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to sign out?");

    if (!confirmed) return;

    setLoggingOut(true);

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      window.alert("Logout failed. Please try again.");
      setLoggingOut(false);
    }
  };

  const handleOpenNotifications = () => {
    setBellOpen(false);
    navigate("/notifications");
  };

  const initials = (user?.name || "User")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">
          <div className="brand-mark">T</div>
          <div>
            <div className="brand-name">TaskFlow</div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigation
            .filter((item) => item.roles.includes(user?.role))
            .map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/dashboard"}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " active" : ""}`
                }
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>

                {item.path === "/notifications" && unreadCount > 0 && (
                  <span className="sidebar-notification-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-version">TASKFLOW · MERN EDITION</div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div>
            <div className="topbar-title">{title}</div>
          </div>

          <div className="topbar-user">
            {/* <div className="user-avatar" aria-hidden="true">
              {initials}
            </div> */}

            {/* <div className="user-details">
              <strong>{user?.name}</strong>
              <span>{user?.role}</span>
            </div> */}

            {/* Notifications */}
            <div className="notification-bell-wrapper" ref={bellRef}>
              <button
                type="button"
                className="notification-bell"
                aria-label={
                  unreadCount > 0
                    ? `Notifications, ${unreadCount} unread`
                    : "Notifications"
                }
                aria-expanded={bellOpen}
                aria-haspopup="true"
                onClick={() => {
                  setBellOpen((open) => !open);
                  setSettingsOpen(false);
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M10 21h4" />
                </svg>

                {unreadCount > 0 && (
                  <span className="notification-bell-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div
                  className="notification-popup"
                  role="region"
                  aria-label="Recent notifications"
                >
                  <div className="notification-popup-header">
                    <strong>Notifications</strong>

                    <button
                      type="button"
                      onClick={() => setBellOpen(false)}
                      aria-label="Close notifications"
                    >
                      ×
                    </button>
                  </div>

                  {notificationsLoading ? (
                    <p className="notification-popup-empty" role="status">
                      Loading notifications...
                    </p>
                  ) : notificationError ? (
                    <div className="notification-popup-error">
                      <p role="alert">{notificationError}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setBellOpen(false);
                          requestAnimationFrame(() => setBellOpen(true));
                        }}
                      >
                        Try again
                      </button>
                    </div>
                  ) : recentNotifications.length === 0 ? (
                    <p className="notification-popup-empty">
                      You're all caught up!
                    </p>
                  ) : (
                    <div className="notification-popup-list">
                      {recentNotifications.map((item) => (
                        <div
                          key={item._id}
                          className={`notification-popup-item ${
                            item.isRead ? "" : "unread"
                          }`}
                        >
                          <span
                            className="notification-popup-dot"
                            aria-hidden="true"
                          />

                          <div>
                            <strong>{item.type || "Update"}</strong>
                            <p>{item.message}</p>
                            <small>
                              {item.createdAt
                                ? new Date(item.createdAt).toLocaleString()
                                : "Date unavailable"}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    className="notification-popup-footer"
                    onClick={handleOpenNotifications}
                  >
                    View all notifications →
                  </button>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="settings-wrapper" ref={settingsRef}>
              <button
                type="button"
                className="settings-button"
                onClick={() => {
                  setSettingsOpen((open) => !open);
                  setBellOpen(false);
                }}
                aria-label="Open settings"
                aria-expanded={settingsOpen}
                aria-haspopup="true"
                title="Settings"
              >
                <span className="nav-icon" aria-hidden="true">
                  ⚙
                </span>
              </button>

              {settingsOpen && (
                <div
                  className="settings-dropdown"
                  role="region"
                  aria-label="Account settings"
                >
                  <div className="settings-profile">
                    <div className="user-avatar" aria-hidden="true">
                      {initials}
                    </div>

                    <div className="settings-profile-details">
                      <strong>{user?.name}</strong>
                      <p>{user?.email}</p>
                      <small>{user?.role}</small>
                    </div>
                  </div>

                  <div className="settings-divider" />

                  <div className="settings-theme-row">
                    <span>{darkMode ? "🌙 Dark mode" : "☀️ Light mode"}</span>

                    <button
                      type="button"
                      className={`theme-toggle ${darkMode ? "active" : ""}`}
                      onClick={() => setDarkMode((current) => !current)}
                      aria-label={`Switch to ${
                        darkMode ? "light" : "dark"
                      } mode`}
                      aria-pressed={darkMode}
                    >
                      <span />
                    </button>
                  </div>

                  <div className="settings-divider" />

                  <button
                    type="button"
                    className="settings-logout"
                    onClick={handleLogout}
                    disabled={loggingOut}
                  >
                    <span aria-hidden="true">↪</span>
                    {loggingOut ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
