"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { useParams } from "next/navigation";

export default function ParentView() {
  const params = useParams();
  const token = params.token as string;
  const [student, setStudent] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: s } = await supabase.from("students").select("*").eq("parent_token", token).maybeSingle();
      if (!s) { setNotFound(true); return; }
      setStudent(s);
      const { data: sess } = await supabase.from("sessions").select("*").eq("student_id", s.id).order("date", { ascending: false });
      setSessions(sess || []);
    }
    load();
  }, [token]);

  if (notFound) return <p style={{ padding: 40, fontFamily: "system-ui" }}>Link not found.</p>;
  if (!student) return <p style={{ padding: 40, fontFamily: "system-ui" }}>Loading...</p>;

  const box = { border: "1px solid #eee", borderRadius: 8, padding: 16, marginBottom: 16 };

  return (
    <div style={{ maxWidth: 640, margin: "40px auto", fontFamily: "system-ui", padding: 20 }}>
      <div style={{ background: "#3a5a78", color: "#fff", borderRadius: 10, padding: 24 }}>
        <div style={{ fontSize: 12, letterSpacing: 1, opacity: 0.8 }}>PROGRESS REPORT</div>
        <div style={{ fontSize: 26, marginTop: 4 }}>{student.name}</div>
        <div style={{ opacity: 0.85, marginTop: 2 }}>{student.grade} · {student.subject}</div>
        <div style={{ marginTop: 10, fontSize: 18 }}>⭐ {student.points || 0} points earned</div>
      </div>

      <h3 style={{ marginTop: 24 }}>Recent sessions</h3>
      {sessions.length === 0 && <p style={{ color: "#888" }}>No sessions logged yet.</p>}
      {sessions.map((sess) => (
        <div key={sess.id} style={box}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{sess.topic}</strong>
            <span style={{ color: "#888", fontSize: 14 }}>{sess.date}</span>
          </div>
          <div style={{ fontSize: 14, color: "#555", margin: "4px 0" }}>Progress: {["", "Needs work", "Developing", "On track", "Strong", "Excellent"][sess.rating]}</div>
          {sess.notes && <p style={{ margin: "4px 0", fontSize: 14 }}>{sess.notes}</p>}
          {sess.homework && <p style={{ margin: "6px 0 0", fontSize: 14, color: "#3a5a78" }}>📚 Homework: {sess.homework}</p>}
        </div>
      ))}
    </div>
  );
}