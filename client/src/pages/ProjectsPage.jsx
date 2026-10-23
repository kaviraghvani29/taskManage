import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./ProjectsPage.css";

export default function ProjectsPage() {
  const { user } = useAuth();
  const canManage = ["Admin", "Manager"].includes(user?.role);

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    teamMembers: [],
  });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadProjects = async () => {
    const response = await api.get("/projects");
    setProjects(response.data.projects || []);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const requests = [api.get("/projects")];
        if (canManage) requests.push(api.get("/users"));

        const results = await Promise.all(requests);
        setProjects(results[0].data.projects || []);

        if (canManage) {
          setUsers(results[1].data.users || []);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load projects.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const toggleMember = (id) => {
    setForm((current) => ({
      ...current,
      teamMembers: current.teamMembers.includes(id)
        ? current.teamMembers.filter((member) => member !== id)
        : [...current.teamMembers, id],
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await api.post("/projects", {
        name: form.name.trim(),
        description: form.description.trim(),
        teamMembers: form.teamMembers,
      });

      setForm({ name: "", description: "", teamMembers: [] });
      setShowForm(false);
      setMessage("Project created successfully.");
      await loadProjects();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create project.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Projects">
      <section className="projects-intro">
        <div>
          <span className="projects-eyebrow">PROJECT WORKSPACE</span>
          <h1>Projects</h1>
          <p>Organize your work and bring your team together.</p>
        </div>

        {canManage && (
          <button
            className="projects-primary-button"
            onClick={() => {
              setError("");
              setMessage("");
              setShowForm((value) => !value);
            }}
          >
            {showForm ? "Cancel" : "+ New project"}
          </button>
        )}
      </section>

      {error && <div className="projects-feedback error">{error}</div>}
      {message && <div className="projects-feedback success">{message}</div>}

      {showForm && canManage && (
        <section className="projects-panel projects-form-panel">
          <div className="projects-panel-heading">
            <div>
              <h2>Create a project</h2>
              <p>Define the project and choose its initial team.</p>
            </div>
          </div>

          <form className="projects-form" onSubmit={handleCreate}>
            <div className="projects-field">
              <label htmlFor="project-name">Project name *</label>
              <input
                id="project-name"
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Customer Portal"
              />
            </div>

            <div className="projects-field">
              <label htmlFor="project-description">Description</label>
              <textarea
                id="project-description"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="What is this project about?"
              />
            </div>

            <div className="projects-field">
              <label>Team members</label>
              <div className="project-member-picker">
                {users.filter((item) => item.role === "Employee").length ===
                0 ? (
                  <p className="project-muted">
                    No employees are available in your accessible team
                    directory. You can create the project now and add members
                    later.
                  </p>
                ) : (
                  users
                    .filter((item) => item.role === "Employee" && item.isActive)
                    .map((member) => (
                      <label className="project-member-option" key={member._id}>
                        <input
                          type="checkbox"
                          checked={form.teamMembers.includes(member._id)}
                          onChange={() => toggleMember(member._id)}
                        />
                        <span className="project-member-avatar">
                          {member.name?.charAt(0).toUpperCase()}
                        </span>
                        <span className="project-member-details">
                          <strong>{member.name}</strong>
                          <small>{member.email}</small>
                        </span>
                      </label>
                    ))
                )}
              </div>
            </div>

            <div className="projects-form-actions">
              <button
                className="projects-secondary-button"
                type="button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                className="projects-primary-button"
                type="submit"
                disabled={saving}
              >
                {saving ? "Creating..." : "Create project"}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="projects-list-heading">
        <div>
          <h2>Your projects</h2>
          <p>Projects you created or are a member of.</p>
        </div>
        <span className="projects-count">{projects.length} projects</span>
      </div>

      {loading ? (
        <div className="projects-empty">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="projects-panel projects-empty">
          <div className="projects-empty-icon">▦</div>
          <h3>No projects yet</h3>
          <p>Your accessible projects will appear here.</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project, index) => (
            <article className="project-card" key={project._id}>
              <div className="project-card-top">
                <span className={`project-card-icon icon-${index % 4}`}>
                  {project.name?.charAt(0).toUpperCase() || "P"}
                </span>
                <span
                  className={`project-status ${
                    project.status === "Completed" ? "completed" : ""
                  }`}
                >
                  {project.status || "Active"}
                </span>
              </div>

              <h3>{project.name}</h3>
              <p className="project-description">
                {project.description || "No project description provided."}
              </p>

              <div className="project-divider" />

              <div className="project-card-footer">
                <div className="project-team">
                  <div className="project-avatar-stack">
                    {(project.teamMembers || [])
                      .slice(0, 4)
                      .map((member, i) => (
                        <span
                          key={member._id || member}
                          className={`project-avatar avatar-${i % 4}`}
                        >
                          {typeof member === "object"
                            ? member.name?.charAt(0).toUpperCase()
                            : "U"}
                        </span>
                      ))}
                  </div>
                  <span>
                    {(project.teamMembers || []).length} team member(s)
                  </span>
                </div>
                <span className="project-created">
                  {project.createdAt
                    ? new Date(project.createdAt).toLocaleDateString()
                    : ""}
                </span>
              </div>

              {project.createdBy && (
                <div className="project-owner">
                  Created by{" "}
                  {typeof project.createdBy === "object"
                    ? project.createdBy.name
                    : "Project owner"}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
