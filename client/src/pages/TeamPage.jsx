import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./TeamPage.css";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "Employee",
};

export default function TeamPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [roleEdits, setRoleEdits] = useState({});
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = async () => {
    const response = await api.get("/users");
    const list = response.data.users || [];

    setUsers(list);
    setRoleEdits(
      Object.fromEntries(list.map((member) => [member._id, member.role])),
    );
  };

  useEffect(() => {
    loadUsers()
      .catch((err) => {
        setError(err.response?.data?.message || "Unable to load team members.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await api.post("/users", form);

      setForm(emptyForm);
      setShowForm(false);
      setMessage("User created successfully.");

      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create user.");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleSave = async (member) => {
    setError("");
    setMessage("");

    try {
      await api.patch(`/users/${member._id}`, {
        role: roleEdits[member._id],
      });

      setMessage(`Role updated for ${member.name}.`);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update role.");
    }
  };

  const handleActiveToggle = async (member) => {
    setError("");
    setMessage("");

    try {
      await api.patch(`/users/${member._id}`, {
        isActive: !member.isActive,
      });

      setMessage(
        `${member.name}'s account has been ${
          member.isActive ? "deactivated" : "activated"
        }.`,
      );

      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update account.");
    }
  };

  const filteredUsers = users.filter((member) =>
    `${member.name} ${member.email} ${member.role}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const countRole = (role) =>
    users.filter((member) => member.role === role).length;

  return (
    <AppLayout title="Team Management">
      <section className="team-intro">
        <div>
          <span className="team-eyebrow">PEOPLE &amp; PERMISSIONS</span>
          <h1>Team management</h1>
          <p>Manage workspace members and their access.</p>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="team-primary-button"
            onClick={() => {
              setError("");
              setMessage("");
              setShowForm((value) => !value);
            }}
          >
            {showForm ? "Close form" : "+ Add user"}
          </button>
        )}
      </section>

      {error && (
        <div className="team-feedback error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="team-feedback success" role="status">
          {message}
        </div>
      )}

      {showForm && isAdmin && (
        <section className="team-panel team-create-panel">
          <div className="team-panel-heading">
            <div>
              <h2>Create workspace user</h2>
              <p>Choose the account's initial role.</p>
            </div>
          </div>

          <form className="team-create-form" onSubmit={handleCreate}>
            <div className="team-field">
              <label htmlFor="team-name">Full name *</label>
              <input
                id="team-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
              />
            </div>

            <div className="team-field">
              <label htmlFor="team-email">Email *</label>
              <input
                id="team-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
              />
            </div>

            <div className="team-field">
              <label htmlFor="team-password">Temporary password *</label>
              <input
                id="team-password"
                type="password"
                minLength={8}
                required
                value={form.password}
                onChange={(e) =>
                  setForm({
                    ...form,
                    password: e.target.value,
                  })
                }
                placeholder="At least 8 characters"
              />
            </div>

            <div className="team-field">
              <label htmlFor="team-role">Role *</label>
              <select
                id="team-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div className="team-form-actions">
              <button
                type="button"
                className="team-secondary-button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

              <button
                className="team-primary-button"
                disabled={saving}
                type="submit"
              >
                {saving ? "Creating..." : "Create user"}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="team-metrics">
        <article className="team-metric">
          <span>Total members shown</span>
          <strong>{users.length}</strong>
        </article>

        <article className="team-metric">
          <span>Admins</span>
          <strong>{countRole("Admin")}</strong>
        </article>

        <article className="team-metric">
          <span>Managers</span>
          <strong>{countRole("Manager")}</strong>
        </article>

        <article className="team-metric">
          <span>Employees</span>
          <strong>{countRole("Employee")}</strong>
        </article>
      </div>

      <section className="team-panel">
        <div className="team-panel-heading team-directory-heading">
          <div>
            <h2>Workspace members</h2>
            <p>
              {isAdmin
                ? "Manage roles and account access."
                : "People in your accessible project teams."}
            </p>
          </div>

          <input
            className="team-search"
            aria-label="Search team members"
            placeholder="Search name, email, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="team-empty">Loading team...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="team-empty">
            <h3>No matching members</h3>
            <p>Try a different search or add a user.</p>
          </div>
        ) : (
          <div className="team-table-wrap">
            <table className="team-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Account</th>
                  {isAdmin && <th>Manage</th>}
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((member) => (
                  <tr key={member._id}>
                    <td>
                      <div className="team-member-cell">
                        <div className="team-avatar">
                          {member.name?.charAt(0).toUpperCase()}
                        </div>

                        <div className="team-member-info">
                          <strong>{member.name}</strong>
                          <span>{member.email}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`team-role-badge ${member.role.toLowerCase()}`}
                      >
                        {member.role}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`team-account-status ${
                          member.isActive ? "active" : "inactive"
                        }`}
                      >
                        {member.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {isAdmin && (
                      <td>
                        <div className="team-manage-cell">
                          <select
                            aria-label={`Role for ${member.name}`}
                            value={roleEdits[member._id] || member.role}
                            onChange={(e) =>
                              setRoleEdits((current) => ({
                                ...current,
                                [member._id]: e.target.value,
                              }))
                            }
                          >
                            <option value="Admin">Admin</option>
                            <option value="Manager">Manager</option>
                            <option value="Employee">Employee</option>
                          </select>

                          <button
                            type="button"
                            className="team-small-button"
                            disabled={roleEdits[member._id] === member.role}
                            onClick={() => handleRoleSave(member)}
                          >
                            Save role
                          </button>

                          <button
                            type="button"
                            className="team-small-button subtle"
                            onClick={() => handleActiveToggle(member)}
                          >
                            {member.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    )}
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
