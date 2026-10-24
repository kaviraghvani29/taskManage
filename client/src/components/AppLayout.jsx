import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
  const navigate = useNavigate();

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
            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
