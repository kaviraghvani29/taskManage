import { useLocation } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import "./WorkspacePage.css";

const pages = {
  "/tasks": {
    title: "Tasks",
    description: "Create, assign, filter, and track tasks.",
    icon: "✓",
  },
  "/projects": {
    title: "Projects",
    description: "Manage projects, team members, and project progress.",
    icon: "▦",
  },
  "/team": {
    title: "Team Management",
    description: "Manage users, roles, and team access.",
    icon: "♧",
  },
  "/notifications": {
    title: "Notifications",
    description: "View task assignments, status updates, and reminders.",
    icon: "♧",
  },
  "/reports": {
    title: "Reports & Analytics",
    description: "Review task statistics, workload, and urgent tasks.",
    icon: "▤",
  },
  "/activity": {
    title: "Activity History",
    description: "Review task changes, status transitions, and audit history.",
    icon: "↻",
  },
};

export default function WorkspacePage() {
  const { pathname } = useLocation();
  const page = pages[pathname] || pages["/tasks"];

  return (
    <AppLayout title={page.title}>
      <section className="workspace-placeholder">
        <div className="workspace-placeholder-icon">{page.icon}</div>
        <span className="workspace-eyebrow">TASKFLOW WORKSPACE</span>
        <h1>{page.title}</h1>
        <p>{page.description}</p>
        <div className="workspace-status">Page connected successfully</div>
      </section>
    </AppLayout>
  );
}
