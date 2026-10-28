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
  { label: "Team", path: "/team", icon: "♧", roles: ["Admin", "Manager"] },
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

  const [bellOpen, setBellOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const bellRef = useRef(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?._id) return;

    const loadUnreadCount = async () => {
      try {
        const response = await api.get("/notifications");
        const notifications = response.data.notifications || [];

        setUnreadCount(notifications.filter((item) => !item.isRead).length);
      } catch (error) {
        console.error("Failed to load unread notification count", error);
      }
    };

    const handleNewNotification = (notification) => {
      if (notification?._id && !notification.isRead) {
        setUnreadCount((count) => count + 1);
      }
    };

    loadUnreadCount();
    socket.on("notification:new", handleNewNotification);

    window.addEventListener("notifications-read", loadUnreadCount);

    return () => {
      socket.off("notification:new", handleNewNotification);
      window.removeEventListener("notifications-read", loadUnreadCount);
    };
  }, [user?._id]);

  useEffect(() => {
    if (!bellOpen) return;

    const loadRecentNotifications = async () => {
      try {
        const response = await api.get("/notifications");
        const items = response.data.notifications || [];

        setRecentNotifications(items.slice(0, 5));
        setUnreadCount(items.filter((item) => !item.isRead).length);
      } catch (error) {
        console.error("Failed to load notifications", error);
      }
    };

    loadRecentNotifications();
  }, [bellOpen]);

  useEffect(() => {
    if (!bellOpen) return;

    const handleOutsideClick = (event) => {
      if (!bellRef.current?.contains(event.target)) {
        setBellOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setBellOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [bellOpen]);

  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("taskflow-theme") === "dark",
  );

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light",
    );
    localStorage.setItem("taskflow-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      alert("Logout failed. Please try again.");
    }
  };

  const initials = (user?.name || "User")
    .split(" ")
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
            {/* <div className="brand-caption">WORKSPACE</div> */}
          </div>
        </div>

        <nav className="sidebar-nav">
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
                <span className="nav-icon">{item.icon}</span>
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
            {/* <div className="topbar-breadcrumb">Workspace / {title}</div> */}
            <div className="topbar-title">{title}</div>
          </div>

          <div className="topbar-user">
            <div className="user-avatar">{initials}</div>
            <div className="user-details">
              <strong>{user?.name}</strong>
              <span>{user?.role}</span>
            </div>
            <div className="notification-bell-wrapper" ref={bellRef}>
              <button
                type="button"
                className="notification-bell"
                aria-label="Notifications"
                aria-expanded={bellOpen}
                onClick={() => setBellOpen((open) => !open)}
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
                <div className="notification-popup">
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

                  {recentNotifications.length === 0 ? (
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
                          <span className="notification-popup-dot" />
                          <div>
                            <strong>{item.type || "Update"}</strong>
                            <p>{item.message}</p>
                            <small>
                              {new Date(item.createdAt).toLocaleString()}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    className="notification-popup-footer"
                    onClick={() => {
                      setBellOpen(false);
                      navigate("/notifications");
                    }}
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </div>

            <div className="settings-wrapper" ref={settingsRef}>
              <button
                type="button"
                className="settings-button"
                onClick={() => setSettingsOpen((open) => !open)}
                aria-label="Open settings"
                title="Settings"
              >
                <span className="nav-icon">⚙</span>
              </button>

              {settingsOpen && (
                <div className="settings-dropdown">
                  <div className="settings-profile">
                    <div className="user-avatar">{initials}</div>
                    <div>
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
                      aria-label="Toggle theme"
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
                  >
                    <span>↪</span> Sign out
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
