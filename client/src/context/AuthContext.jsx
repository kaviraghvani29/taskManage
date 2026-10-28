import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { socket } from "../services/socket";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?._id) {
      socket.connect();
    } else {
      socket.disconnect();
    }

    return () => {
      socket.disconnect();
    };
  }, [user?._id]);

  const login = async (data) => {
    const res = await api.post("/auth/login", data);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const res = await api.post("/auth/register", data);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
