"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [students, setStudents] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push("/");
      else loadStudents();
    });
  }, [router]);

  async function loadStudents() {
    const { data } = await supabase.from("students").select("*").order("name");
    setStudents(data || []);
  }

  async function addStudent() {
    if (!name.trim()) return;
    await supabase.from("students").insert({ name, grade, subject });
    setName(""); setGrade(""); setSubject(""); setShowAdd(false);
    loadStudents();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 26 }}>My Students</h1>
        <button onClick={logout} style={{ padding: "6px 12px", cursor: "pointer" }}>Log out</button>
      </div>

      <button onClick={() => setShowAdd(!showAdd)} style={{ padding: "8px 16px", marginTop: 12, background: "#3a5a78", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
        + Add student
      </button>

      {showAdd && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginTop: 12 }}>
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={{ display: "block", width: "100%", padding: 8, marginBottom: 8, boxSizing: "border-box" }} />
          <input placeholder="Grade (e.g. Primary 3)" value={grade} onChange={(e) => setGrade(e.target.value)} style={{ display: "block", width: "100%", padding: 8, marginBottom: 8, boxSizing: "border-box" }} />
          <input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ display: "block", width: "100%", padding: 8, marginBottom: 8, boxSizing: "border-box" }} />
          <button onClick={addStudent} style={{ padding: "8px 16px", background: "#3f8f5b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Save</button>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        {students.length === 0 && <p style={{ color: "#888" }}>No students yet. Add your first one above.</p>}
                {students.map((s) => (
          <div key={s.id} onClick={() => router.push(`/dashboard/student/${s.id}`)} style={{ border: "1px solid #eee", borderRadius: 8, padding: 16, marginBottom: 10, cursor: "pointer" }}>
            <div style={{ fontSize: 18 }}>{s.name}</div>
            <div style={{ color: "#888", fontSize: 14 }}>{s.grade} · {s.subject}</div>
          </div>
        ))}
      </div>
    </div>
  );
}