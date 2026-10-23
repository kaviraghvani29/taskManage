import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create your account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <aside className="auth-brand-panel">
          <div className="auth-brand">
            <div className="auth-logo">T</div>
            <div>
              <div className="auth-brand-name">TaskFlow</div>
              <div className="auth-brand-subtitle">WORKSPACE</div>
            </div>
          </div>

          <div className="auth-brand-copy">
            <span className="auth-eyebrow">A BETTER WAY TO WORK</span>
            <h1>Start organized. Stay focused.</h1>
            <p>
              Create your account and bring your tasks, deadlines and daily
              progress into one place.
            </p>

            <div className="auth-feature-list">
              <div className="auth-feature">
                <span className="auth-feature-check">✓</span>
                Keep tasks in one place
              </div>
              <div className="auth-feature">
                <span className="auth-feature-check">✓</span>
                Follow progress and deadlines
              </div>
              <div className="auth-feature">
                <span className="auth-feature-check">✓</span>
                Work with your project team
              </div>
            </div>
          </div>

          <div className="auth-brand-footer">
            TASKFLOW · PLAN BETTER. WORK SMARTER.
          </div>
        </aside>

        <section className="auth-form-panel">
          <div className="auth-form-inner">
            <span className="auth-form-kicker">GET STARTED</span>
            <h2>Create your account</h2>
            <p className="auth-form-description">
              Fill in your details to join TaskFlow. New accounts start as
              Employees.
            </p>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="register-name">Full name</label>
                <input
                  id="register-name"
                  className="auth-input"
                  type="text"
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="register-email">Email address</label>
                <input
                  id="register-email"
                  className="auth-input"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="register-password">Password</label>
                <input
                  id="register-password"
                  className="auth-input"
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </div>

              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? "Creating account..." : "Create account →"}
              </button>
            </form>

            <p className="auth-switch">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>

            <div className="auth-security-note">
              Your workspace starts with secure account access
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
