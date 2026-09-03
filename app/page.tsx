"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push("/dashboard");
    });
  }, [router]);

  async function handleLogin() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else router.push("/dashboard");
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", fontFamily: "system-ui", padding: 20 }}>
      <h1 style={{ fontSize: 24 }}>Tutor Login</h1>
      <input style={{ width: "100%", padding: 10, marginTop: 12, boxSizing: "border-box" }} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input style={{ width: "100%", padding: 10, marginTop: 12, boxSizing: "border-box" }} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button style={{ width: "100%", padding: 10, marginTop: 12, background: "#3a5a78", color: "#fff", border: "none", cursor: "pointer" }} onClick={handleLogin} disabled={loading}>
        {loading ? "Logging in..." : "Log in"}
      </button>
      {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}
    </div>
  );
}