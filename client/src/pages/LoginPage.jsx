import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(form);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to sign in. Please try again.",
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
            <span className="auth-eyebrow">YOUR WORKSPACE AWAITS</span>
            <h1>Make every task count.</h1>
            <p>
              Bring your projects, priorities and team together in one organized
              workspace.
            </p>

            <div className="auth-feature-list">
              <div className="auth-feature">
                <span className="auth-feature-check">✓</span>
                Stay on top of deadlines
              </div>
              <div className="auth-feature">
                <span className="auth-feature-check">✓</span>
                Collaborate across projects
              </div>
              <div className="auth-feature">
                <span className="auth-feature-check">✓</span>
                Track work from start to finish
              </div>
            </div>
          </div>

          <div className="auth-brand-footer">
            TASKFLOW · PLAN BETTER. WORK SMARTER.
          </div>
        </aside>

        <section className="auth-form-panel">
          <div className="auth-form-inner">
            <span className="auth-form-kicker">WELCOME BACK</span>
            <h2>Sign in to TaskFlow</h2>
            <p className="auth-form-description">
              Enter your account details to access your workspace.
            </p>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="login-email">Email address</label>
                <input
                  id="login-email"
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
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  className="auth-input"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </div>

              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign in to workspace →"}
              </button>
            </form>

            <p className="auth-switch">
              New to TaskFlow? <Link to="/register">Create an account</Link>
            </p>

            <div className="auth-security-note">
              Secure access to your workspace
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
