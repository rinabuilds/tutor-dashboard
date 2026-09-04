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

  // grade form
  const [grades, setGrades] = useState<any[]>([]);
  const [assessment, setAssessment] = useState("");
  const [marks, setMarks] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  const [gradeDate, setGradeDate] = useState("");

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
    const { data: g } = await supabase.from("grades").select("*").eq("student_id", studentId).order("date", { ascending: false });
    setGrades(g || []);
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

  async function addGrade() {
    if (!assessment.trim()) return;
    await supabase.from("grades").insert({
      student_id: studentId,
      assessment,
      marks: marks === "" ? null : Number(marks),
      max_marks: maxMarks === "" ? null : Number(maxMarks),
      date: gradeDate || null,
    });
    setAssessment(""); setMarks(""); setMaxMarks(""); setGradeDate("");
    loadAll();
  }

  async function deleteGrade(id: string) {
    if (!confirm("Delete this grade?")) return;
    await supabase.from("grades").delete().eq("id", id);
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

      <div style={box}>
        <h3>Add exam / assessment grade</h3>
        <input placeholder="Assessment name (e.g. Term 1 Math Test)" value={assessment} onChange={(e) => setAssessment(e.target.value)} style={input} />
        <div style={{ display: "flex", gap: 8 }}>
          <input type="number" placeholder="Marks" value={marks} onChange={(e) => setMarks(e.target.value)} style={{ ...input, marginBottom: 0 }} />
          <input type="number" placeholder="Out of" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} style={{ ...input, marginBottom: 0 }} />
        </div>
        <input type="date" value={gradeDate} onChange={(e) => setGradeDate(e.target.value)} style={{ ...input, marginTop: 8 }} />
        <button onClick={addGrade} style={{ padding: "8px 16px", background: "#3a5a78", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Save grade</button>
      </div>

      <h3>Grade history</h3>
      {grades.length === 0 && <p style={{ color: "#888" }}>No grades yet.</p>}
      {grades.map((g) => {
        const pct = (g.marks != null && g.max_marks) ? Math.round((g.marks / g.max_marks) * 100) : null;
        return (
          <div key={g.id} style={box}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{g.assessment}</strong>
              <span style={{ color: "#888", fontSize: 14 }}>{g.date}</span>
            </div>
            <div style={{ fontSize: 15, margin: "4px 0" }}>
              {g.marks != null ? g.marks : "—"}{g.max_marks ? ` / ${g.max_marks}` : ""}
              {pct != null && <span style={{ marginLeft: 8, color: pct >= 50 ? "#3f8f5b" : "#c0442e", fontWeight: 600 }}>({pct}%)</span>}
            </div>
            <button onClick={() => deleteGrade(g.id)} style={{ padding: "4px 10px", cursor: "pointer", fontSize: 13, color: "#c0442e", border: "1px solid #c0442e", borderRadius: 4, background: "#fff" }}>Delete</button>
          </div>
        );
      })}
    </div>
  );
}