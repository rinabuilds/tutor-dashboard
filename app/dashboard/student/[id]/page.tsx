"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../../../lib/supabase";
import { useRouter, useParams } from "next/navigation";

export default function StudentDetail() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [notes, setNotes] = useState("");

  // session form
  const [date, setDate] = useState("");
  const [topic, setTopic] = useState("");
  const [rating, setRating] = useState(3);
  const [sessionNotes, setSessionNotes] = useState("");
  const [homework, setHomework] = useState("");
  const [points, setPoints] = useState(5);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push("/");
      else loadAll();
    });
  }, []);

  async function loadAll() {
    const { data: s } = await supabase.from("students").select("*").eq("id", studentId).single();
    setStudent(s);
    setNotes(s?.general_notes || "");
    const { data: sess } = await supabase.from("sessions").select("*").eq("student_id", studentId).order("date", { ascending: false });
    setSessions(sess || []);
  }

  async function addSession() {
    if (!date || !topic.trim()) return;
    if (editingId) {
      await supabase.from("sessions").update({ date, topic, rating, notes: sessionNotes, homework }).eq("id", editingId);
      setEditingId(null);
    } else {
      await supabase.from("sessions").insert({ student_id: studentId, date, topic, rating, notes: sessionNotes, homework });
      await supabase.from("point_events").insert({ student_id: studentId, amount: points, reason: `Session: ${topic}` });
      await supabase.from("students").update({ points: (student.points || 0) + points }).eq("id", studentId);
    }
    setDate(""); setTopic(""); setRating(3); setSessionNotes(""); setHomework(""); setPoints(5);
    loadAll();
  }

  function startEdit(sess: any) {
    setEditingId(sess.id);
    setDate(sess.date);
    setTopic(sess.topic);
    setRating(sess.rating);
    setSessionNotes(sess.notes || "");
    setHomework(sess.homework || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setDate(""); setTopic(""); setRating(3); setSessionNotes(""); setHomework(""); setPoints(5);
  }

  async function deleteSession(id: string) {
    if (!confirm("Delete this session?")) return;
    await supabase.from("sessions").delete().eq("id", id);
    loadAll();
  }

  async function saveNotes() {
    await supabase.from("students").update({ general_notes: notes }).eq("id", studentId);
    alert("Notes saved!");
  }

    async function deleteStudent() {
    if (!confirm(`Delete ${student.name}? This removes all their sessions and cannot be undone.`)) return;
    const { error } = await supabase.from("students").delete().eq("id", studentId);
    if (error) {
      alert("Delete failed: " + error.message);
      console.log("Delete error:", error);
    } else {
      router.push("/dashboard");
    }
  }

  if (!student) return <p style={{ padding: 40, fontFamily: "system-ui" }}>Loading...</p>;

  const box = { border: "1px solid #eee", borderRadius: 8, padding: 16, marginBottom: 16 };
  const input = { display: "block", width: "100%", padding: 8, marginBottom: 8, boxSizing: "border-box" as const };

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui", padding: 20 }}>
      <button onClick={() => router.push("/dashboard")} style={{ padding: "6px 12px", cursor: "pointer", marginBottom: 16 }}>← All students</button>
      <button onClick={deleteStudent} style={{ padding: "6px 12px", cursor: "pointer", marginBottom: 16, marginLeft: 8, color: "#c0442e", border: "1px solid #c0442e", borderRadius: 6, background: "#fff" }}>Delete student</button>

      <h1 style={{ fontSize: 26 }}>{student.name}</h1>
      <div style={{ color: "#888" }}>{student.grade} · {student.subject}</div>
      <div style={{ marginTop: 8, fontSize: 18 }}>⭐ {student.points || 0} points</div>

      <div style={{ ...box, marginTop: 20 }}>
        <h3>General notes</h3>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...input, minHeight: 70 }} placeholder="e.g. Responds well to praise, allergic to peanuts..." />
        <button onClick={saveNotes} style={{ padding: "6px 14px", cursor: "pointer" }}>Save notes</button>
      </div>

      <div style={box}>
        <h3>{editingId ? "Edit session" : "Log a session"}</h3>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={input} />
        <input placeholder="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} style={input} />
        <label style={{ fontSize: 14 }}>Progress: </label>
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))} style={{ ...input, width: "auto", display: "inline-block", marginLeft: 8 }}>
          <option value={1}>Needs work</option>
          <option value={2}>Developing</option>
          <option value={3}>On track</option>
          <option value={4}>Strong</option>
          <option value={5}>Excellent</option>
        </select>
        {!editingId && <>
          <label style={{ fontSize: 14, marginLeft: 16 }}>Points: </label>
          <input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} style={{ width: 60, padding: 6, marginLeft: 8 }} />
        </>}
        <textarea placeholder="Session notes (parents see these)" value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} style={{ ...input, minHeight: 60, marginTop: 8 }} />
        <textarea placeholder="Homework given (e.g. Worksheet pg 12–14)" value={homework} onChange={(e) => setHomework(e.target.value)} style={{ ...input, minHeight: 50, marginTop: 8 }} />
        <button onClick={addSession} style={{ padding: "8px 16px", background: "#3f8f5b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>{editingId ? "Update session" : `Save session (+${points} pts)`}</button>
        {editingId && <button onClick={cancelEdit} style={{ padding: "8px 16px", marginLeft: 8, cursor: "pointer" }}>Cancel</button>}
      </div>

      <h3>Session history</h3>
      {sessions.length === 0 && <p style={{ color: "#888" }}>No sessions yet.</p>}
      {sessions.map((sess) => (
        <div key={sess.id} style={box}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{sess.topic}</strong>
            <span style={{ color: "#888", fontSize: 14 }}>{sess.date}</span>
          </div>
          <div style={{ fontSize: 14, color: "#555", margin: "4px 0" }}>Progress: {["", "Needs work", "Developing", "On track", "Strong", "Excellent"][sess.rating]}</div>
          <p style={{ margin: 0, fontSize: 14 }}>{sess.notes}</p>
          {sess.homework && <p style={{ margin: "6px 0 0", fontSize: 14, color: "#3a5a78" }}>📚 Homework: {sess.homework}</p>}
          <div style={{ marginTop: 10 }}>
            <button onClick={() => startEdit(sess)} style={{ padding: "4px 10px", cursor: "pointer", marginRight: 8, fontSize: 13 }}>Edit</button>
            <button onClick={() => deleteSession(sess.id)} style={{ padding: "4px 10px", cursor: "pointer", fontSize: 13, color: "#c0442e", border: "1px solid #c0442e", borderRadius: 4, background: "#fff" }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}