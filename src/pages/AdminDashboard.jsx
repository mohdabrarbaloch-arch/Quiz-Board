import {
  BarChartOutlined, DeleteOutlined, DownloadOutlined,
  EditOutlined, ExportOutlined, FileAddOutlined, LogoutOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined,
  PlusOutlined, ReloadOutlined, EyeOutlined,
} from "@ant-design/icons";
import {
  Button, Checkbox, Form, Input, InputNumber,
  Popconfirm, Select, Table, Tag, message,
} from "antd";
import { signOut } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatCard from "../components/ui/StatCard";
import { sampleQuiz } from "../data/sampleQuiz";
import { auth } from "../lib/firebase";
import { calculateObjectiveScore, escapeCsv, formatDate } from "../lib/quiz";
import {
  createQuiz, deleteQuiz, fetchAnswerKeys,
  fetchQuizQuestions, fetchQuizzes, toggleQuizPublished,
} from "../services/quizService";
import { deleteAttempt, fetchSubmissions } from "../services/submissionService";

function blankQuestion() {
  return { type: "mcq", prompt: "", options: ["", "", "", ""], correctAnswer: "", points: 1, timeSeconds: 45 };
}

const NAV = [
  { key: "quizzes", label: "Quizzes", icon: <BarChartOutlined /> },
  { key: "create", label: "Create Quiz", icon: <FileAddOutlined /> },
  { key: "submissions", label: "Submissions", icon: <ExportOutlined /> },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("quizzes");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [questions, setQuestions] = useState([blankQuestion()]);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [submissionQuestions, setSubmissionQuestions] = useState([]);
  const [answerKeys, setAnswerKeys] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [search, setSearch] = useState("");

  /* ── Load quizzes ─────────────────────────────────────────── */
  const loadQuizzes = useCallback(async () => {
    setLoadingQuizzes(true);
    try {
      const items = await fetchQuizzes();
      setQuizzes(items);
      if (!selectedQuizId && items[0]) setSelectedQuizId(items[0].id);
    } catch { message.error("Could not load quizzes."); }
    finally { setLoadingQuizzes(false); }
  }, [selectedQuizId]);

  useEffect(() => { loadQuizzes(); }, [loadQuizzes]);
  const selectedQuiz = useMemo(() => quizzes.find((q) => q.id === selectedQuizId), [quizzes, selectedQuizId]);

  /* ── Load submissions ─────────────────────────────────────── */
  async function loadSubmissions(qid) {
    if (!qid) return;
    setSelectedQuizId(qid);
    setLoadingSubmissions(true);
    try {
      const [subs, qs, keys] = await Promise.all([
        fetchSubmissions(qid), fetchQuizQuestions(qid), fetchAnswerKeys(qid),
      ]);
      setSubmissions(subs);
      setSubmissionQuestions(qs);
      setAnswerKeys(keys);
    } catch { message.error("Could not load submissions."); }
    finally { setLoadingSubmissions(false); }
  }

  useEffect(() => {
    if (tab === "submissions" && selectedQuizId) loadSubmissions(selectedQuizId);
  }, [tab, selectedQuizId]);

  /* ── Quiz CRUD ────────────────────────────────────────────── */
  async function handleTogglePublished(quiz) {
    try {
      await toggleQuizPublished(quiz.id, !quiz.isPublished);
      setQuizzes((all) => all.map((q) => q.id === quiz.id ? { ...q, isPublished: !q.isPublished } : q));
      message.success(quiz.isPublished ? "Quiz closed." : "Quiz published!");
    } catch { message.error("Could not update quiz status."); }
  }

  async function handleDeleteQuiz(quizId) {
    try {
      await deleteQuiz(quizId);
      setQuizzes((all) => all.filter((q) => q.id !== quizId));
      message.success("Quiz deleted.");
    } catch { message.error("Could not delete quiz."); }
  }

  function handleDuplicateQuiz(quiz) {
    form.setFieldsValue({
      title: `${quiz.title} (Copy)`, description: quiz.description || "",
      durationMinutes: quiz.durationMinutes, questionTimeSeconds: quiz.questionTimeSeconds || 45,
      maxViolations: quiz.maxViolations || 3, randomizeQuestions: false,
      randomizeOptions: false, isPublished: false,
    });
    setTab("create");
    message.info("Quiz loaded. Review and save.");
  }

  async function handleResetAttempt(sub) {
    try {
      await deleteAttempt(selectedQuizId, sub.rollNoKey);
      setSubmissions((all) => all.filter((s) => s.id !== sub.id));
      message.success("Attempt reset.");
    } catch { message.error("Could not reset attempt."); }
  }

  /* ── Question helpers ─────────────────────────────────────── */
  function updateQuestion(idx, field, value) {
    setQuestions((all) => all.map((q, i) => {
      if (i !== idx) return q;
      if (field === "type") {
        if (value === "true_false") return { ...q, type: value, options: ["True", "False"], correctAnswer: "True" };
        if (value === "short_text") return { ...q, type: value, options: [], correctAnswer: "" };
        return { ...q, type: value, options: ["", "", "", ""], correctAnswer: "" };
      }
      return { ...q, [field]: value };
    }));
  }

  function updateOption(qi, oi, value) {
    setQuestions((all) => all.map((q, i) => {
      if (i !== qi) return q;
      const old = q.options[oi];
      const options = q.options.map((o, j) => (j === oi ? value : o));
      return { ...q, options, correctAnswer: q.correctAnswer === old ? value : q.correctAnswer };
    }));
  }

  function validateQuiz() {
    const title = form.getFieldValue("title");
    if (!title?.trim()) return "Quiz title is required.";
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) return `Question ${i + 1} is empty.`;
      if (q.type === "mcq" && (q.options.some((o) => !o.trim()) || !q.correctAnswer))
        return `Complete all options and select correct answer for Q${i + 1}.`;
    }
    return "";
  }

  async function saveQuiz(values) {
    const err = validateQuiz();
    if (err) { message.error(err); return; }
    setSaving(true);
    try {
      await createQuiz({
        title: values.title, description: values.description || "",
        durationMinutes: values.durationMinutes, questionTimeSeconds: values.questionTimeSeconds || 45,
        maxViolations: values.maxViolations || 3, randomizeQuestions: values.randomizeQuestions || false,
        randomizeOptions: values.randomizeOptions || false, isPublished: values.isPublished || false,
      }, questions);
      message.success(`Quiz saved with ${questions.length} questions.`);
      form.resetFields();
      setQuestions([blankQuestion()]);
      await loadQuizzes();
      setTab("quizzes");
    } catch { message.error("Could not save quiz."); }
    finally { setSaving(false); }
  }

  /* ── CSV export ───────────────────────────────────────────── */
  function handleExportCsv() {
    if (!submissions.length) return;
    const rows = [
      ["Name", "Roll No", "Status", "Answered", "Unanswered", "Score", "Max", "Violations", "Terminated", "Submitted"],
      ...submissions.map((s) => {
        const r = calculateObjectiveScore(s, submissionQuestions, answerKeys);
        return [
          escapeCsv(s.studentName || ""), escapeCsv(s.rollNo || s.rollNoKey),
          s.status || "submitted", s.answeredCount || 0, s.unansweredCount || 0,
          r.score, r.maximum, s.violationCount || 0,
          escapeCsv(s.terminationReason || ""), escapeCsv(formatDate(s.submittedAt || s.startedAt)),
        ];
      }),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), {
      href: url, download: `${selectedQuiz?.title || "quiz"}-results.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredSubmissions = useMemo(() => {
    if (!search) return submissions;
    const q = search.toLowerCase();
    return submissions.filter((s) =>
      (s.studentName || "").toLowerCase().includes(q) ||
      (s.rollNo || "").toLowerCase().includes(q)
    );
  }, [submissions, search]);

  /* ── Submission table columns ─────────────────────────────── */
  const submissionColumns = [
    {
      title: "Student", key: "student",
      render: (_, r) => (
        <div>
          <p className="font-semibold text-gray-900 text-sm">{r.studentName || <em className="text-gray-400">In progress</em>}</p>
          <p className="text-xs text-gray-500">{r.rollNo || r.rollNoKey}</p>
          <div className="flex gap-1 mt-1">
            {r.status === "terminated" && <Tag color="red" className="!text-xs">Terminated</Tag>}
            {r.autoSubmitted && r.status !== "terminated" && <Tag color="orange" className="!text-xs">Auto</Tag>}
            {r.status === "started" && <Tag color="blue" className="!text-xs">In Progress</Tag>}
          </div>
        </div>
      ),
    },
    {
      title: "Score", key: "score",
      render: (_, r) => {
        if (r.status === "started") return <span className="text-gray-400">—</span>;
        const res = calculateObjectiveScore(r, submissionQuestions, answerKeys);
        const pct = res.maximum > 0 ? Math.round((res.score / res.maximum) * 100) : 0;
        return (
          <div>
            <p className="font-bold text-gray-900">{res.score}/{res.maximum}</p>
            <p className="text-xs text-gray-500">{pct}% • {res.correct} correct</p>
          </div>
        );
      },
    },
    {
      title: "Answered", key: "answered",
      render: (_, r) => r.status === "started" ? "—" : `${r.answeredCount || 0} / ${(r.answers || []).length}`,
    },
    {
      title: "Violations", dataIndex: "violationCount", key: "v",
      render: (v) => (
        <Tag color={v >= 3 ? "red" : v > 0 ? "orange" : "green"}>{v || 0}</Tag>
      ),
    },
    {
      title: "Submitted", key: "time",
      render: (_, r) => <span className="text-xs text-gray-500">{formatDate(r.submittedAt || r.startedAt)}</span>,
    },
    {
      title: "", key: "actions",
      render: (_, r) => r.status === "started" ? (
        <Popconfirm title="Reset this attempt?" onConfirm={() => handleResetAttempt(r)}>
          <Button size="small" danger>Reset</Button>
        </Popconfirm>
      ) : (
        <button
          onClick={() => navigate(`/admin/submissions/${selectedQuizId}/${r.id}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 font-semibold text-xs rounded-lg border border-primary-200 transition-all"
        >
          <EyeOutlined /> Review
        </button>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} flex-shrink-0 flex flex-col bg-gradient-to-b from-primary-600 to-primary-700 sticky top-0 h-screen shadow-2xl transition-all duration-300 relative`}>

        {/* No floating toggle here — it lives in the header */}

        {/* Logo */}
        <div className={`${sidebarCollapsed ? 'px-4' : 'px-6'} py-6 border-b border-white/10`}>
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-xl group-hover:bg-white/30 transition flex-shrink-0">Q</div>
            {!sidebarCollapsed && (
              <div>
                <p className="text-white font-black text-base leading-none">QuizGuard</p>
                <p className="text-white/80 text-xs mt-0.5">Admin Panel</p>
              </div>
            )}
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {NAV.map((item) => (
            <button
              key={item.key} onClick={() => setTab(item.key)} type="button"
              title={sidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-left
                ${tab === item.key
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/80 hover:bg-white/15 hover:text-white"
                }`}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={() => signOut(auth)} type="button"
            title={sidebarCollapsed ? "Sign Out" : undefined}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-2.5 rounded-xl text-sm font-semibold text-white/80 hover:bg-white/15 hover:text-white transition-all`}
          >
            <LogoutOutlined className="flex-shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>

        {/* Footer credit */}
        {!sidebarCollapsed && (
          <div className="px-6 py-4 border-t border-white/10">
            <p className="text-white/70 text-xs text-center">
              © {new Date().getFullYear()}{" "}
              <a href="https://github.com/AbdulMoiz34" target="_blank" rel="noopener noreferrer"
                className="text-white hover:text-white/90 transition-colors font-semibold">
                Abdul Moiz
              </a>
            </p>
          </div>
        )}
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Sidebar toggle — always visible in header */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-primary-50 text-gray-600 hover:text-primary-700 border border-gray-200 hover:border-primary-300 transition-all shadow-sm"
            >
              {sidebarCollapsed
                ? <MenuUnfoldOutlined style={{ fontSize: 18 }} />
                : <MenuFoldOutlined style={{ fontSize: 18 }} />}
            </button>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">AI &amp; Game Creators</p>
              <h1 className="text-xl font-black text-gray-900">
                {tab === "quizzes" ? "Quiz Overview" : tab === "create" ? "Create Quiz" : "Student Submissions"}
              </h1>
            </div>
          </div>
        </header>

        <div className="p-8">

          {/* ── QUIZZES TAB ─────────────────────────────────── */}
          {tab === "quizzes" && (
            <>
              <div className="grid grid-cols-3 gap-5 mb-8">
                <StatCard label="Total Quizzes" value={quizzes.length} />
                <StatCard label="Published" value={quizzes.filter((q) => q.isPublished).length} valueClass="text-primary-600" />
                <StatCard label="Drafts" value={quizzes.filter((q) => !q.isPublished).length} valueClass="text-gray-400" />
              </div>

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Your Quizzes</h2>
                  <p className="text-sm text-gray-500 mt-1">Create a quiz, then publish when students are ready.</p>
                </div>
                <button
                  onClick={() => setTab("create")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  <PlusOutlined /> New Quiz
                </button>
              </div>

              {loadingQuizzes ? (
                <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
                  <span className="loader" /> <span className="text-sm">Loading quizzes…</span>
                </div>
              ) : quizzes.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-2xl py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-2xl text-gray-400">
                    <FileAddOutlined />
                  </div>
                  <p className="font-bold text-gray-800">No quizzes yet</p>
                  <p className="text-sm text-gray-500 mt-1">Click "New Quiz" to create your first quiz.</p>
                </div>
              ) : (
                <div className="grid gap-5">
                  {quizzes.map((quiz) => (
                    <div key={quiz.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:border-primary-200 transition-all duration-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${quiz.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                              {quiz.isPublished ? "● Live" : "○ Draft"}
                            </span>
                            <span className="text-xs text-gray-400">{quiz.questionCount || 0} questions • {quiz.durationMinutes} min • {quiz.maxViolations || 3} violations</span>
                          </div>
                          <h3 className="font-black text-gray-900 text-lg leading-tight mb-1">{quiz.title}</h3>
                          <p className="text-sm text-gray-500 truncate">{quiz.description || "No description"}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleTogglePublished(quiz)}
                            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${quiz.isPublished ? "bg-gray-100 hover:bg-gray-200 text-gray-700" : "bg-primary-600 hover:bg-primary-700 text-white shadow-md"}`}
                          >
                            {quiz.isPublished ? "Close" : "Publish"}
                          </button>
                          <button onClick={() => { setSelectedQuizId(quiz.id); setTab("submissions"); }} className="px-3 py-2 text-sm font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-all">
                            <EyeOutlined /> Submissions
                          </button>
                          <button onClick={() => handleDuplicateQuiz(quiz)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">
                            <EditOutlined />
                          </button>
                          <Popconfirm title="Delete this quiz?" description="This cannot be undone." onConfirm={() => handleDeleteQuiz(quiz.id)}>
                            <button className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><DeleteOutlined /></button>
                          </Popconfirm>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── CREATE TAB ──────────────────────────────────── */}
          {tab === "create" && (
            <Form form={form} layout="vertical" onFinish={saveQuiz}
              initialValues={{ durationMinutes: 45, questionTimeSeconds: 45, maxViolations: 3, randomizeQuestions: false, randomizeOptions: false, isPublished: false }}
            >
              {/* Quiz Details Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-black text-gray-900">Quiz Details</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Title, duration, and exam settings</p>
                  </div>
                  <button type="button" onClick={() => {
                    const s = JSON.parse(JSON.stringify(sampleQuiz));
                    form.setFieldsValue({ title: s.title, description: s.description, durationMinutes: s.durationMinutes, questionTimeSeconds: s.questionTimeSeconds || 45, maxViolations: s.maxViolations || 3, randomizeQuestions: false, randomizeOptions: false, isPublished: false });
                    setQuestions(s.questions);
                  }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-all cursor-pointer">
                    Load Sample Quiz
                  </button>
                </div>
                <div className="px-6 py-5">
                  <Form.Item name="title" label={<span className="text-sm font-semibold text-gray-700">Quiz Title</span>} rules={[{ required: true, message: "Enter a quiz title" }]}>
                    <Input size="large" placeholder="e.g. Final Roblox Programming Quiz" className="rounded-xl" />
                  </Form.Item>
                  <Form.Item name="description" label={<span className="text-sm font-semibold text-gray-700">Instructions (optional)</span>}>
                    <Input.TextArea rows={2} placeholder="Read all questions carefully before answering…" className="rounded-xl" />
                  </Form.Item>
                  <div className="grid grid-cols-3 gap-4">
                    <Form.Item name="durationMinutes" label={<span className="text-sm font-semibold text-gray-700">Duration (minutes)</span>} rules={[{ required: true }]}>
                      <InputNumber min={1} max={300} style={{ width: "100%" }} size="large" />
                    </Form.Item>
                    <Form.Item name="questionTimeSeconds" label={<span className="text-sm font-semibold text-gray-700">Seconds per question</span>} rules={[{ required: true }]}>
                      <InputNumber min={10} max={300} style={{ width: "100%" }} size="large" />
                    </Form.Item>
                    <Form.Item name="maxViolations" label={<span className="text-sm font-semibold text-gray-700">Max violations</span>} rules={[{ required: true }]}>
                      <InputNumber min={1} max={10} style={{ width: "100%" }} size="large" />
                    </Form.Item>
                  </div>
                  <div className="flex items-center gap-6">
                    <Form.Item name="randomizeQuestions" valuePropName="checked" className="!mb-0">
                      <Checkbox><span className="text-sm font-medium text-gray-700">Randomize questions</span></Checkbox>
                    </Form.Item>
                    <Form.Item name="randomizeOptions" valuePropName="checked" className="!mb-0">
                      <Checkbox><span className="text-sm font-medium text-gray-700">Randomize options</span></Checkbox>
                    </Form.Item>
                    <Form.Item name="isPublished" valuePropName="checked" className="!mb-0">
                      <Checkbox><span className="text-sm font-medium text-gray-700">Publish immediately</span></Checkbox>
                    </Form.Item>
                  </div>
                </div>
              </div>

              {/* Questions Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-black text-gray-900">Questions</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{questions.length} question{questions.length !== 1 ? "s" : ""} added</p>
                  </div>
                  <button type="button" onClick={() => setQuestions((q) => [...q, blankQuestion()])}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl shadow-md transition-all">
                    <PlusOutlined /> Add Question
                  </button>
                </div>

                <div className="px-6 py-6 space-y-5">
                  {questions.map((q, qi) => (
                    <div key={qi} className="border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-primary-200 transition-all">
                      {/* Question header */}
                      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                        <span className="text-sm font-black text-gray-700">Question {qi + 1}</span>
                        <div className="flex items-center gap-3">
                          <Select value={q.type} onChange={(v) => updateQuestion(qi, "type", v)} size="small"
                            options={[{ label: "Multiple Choice", value: "mcq" }, { label: "True / False", value: "true_false" }, { label: "Short Answer", value: "short_text" }]}
                            style={{ width: 160 }} />
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-500">Points:</span>
                            <InputNumber min={1} max={100} value={q.points} onChange={(v) => updateQuestion(qi, "points", v)} size="small" style={{ width: 60 }} />
                          </div>
                          {questions.length > 1 && (
                            <button type="button" onClick={() => setQuestions((all) => all.filter((_, i) => i !== qi))}
                              className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-all cursor-pointer">
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="px-5 py-5">
                        <Input.TextArea rows={2} value={q.prompt} onChange={(e) => updateQuestion(qi, "prompt", e.target.value)}
                          placeholder="Write your question here…" className="rounded-xl mb-4" />

                        {q.type === "mcq" && (
                          <div className="grid grid-cols-2 gap-3">
                            {q.options.map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2.5">
                                <input type="radio" name={`correct-${qi}`} checked={q.correctAnswer === opt && !!opt}
                                  onChange={() => opt && updateQuestion(qi, "correctAnswer", opt)}
                                  className="accent-primary-600 w-4 h-4 flex-shrink-0" title="Mark as correct" />
                                <Input value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)}
                                  placeholder={`Option ${String.fromCharCode(65 + oi)}`} className="rounded-lg" />
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === "true_false" && (
                          <div className="flex gap-3">
                            {["True", "False"].map((opt) => (
                              <label key={opt} className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all ${q.correctAnswer === opt ? "border-primary-600 bg-primary-50 text-primary-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                                <input type="radio" name={`tf-${qi}`} checked={q.correctAnswer === opt} onChange={() => updateQuestion(qi, "correctAnswer", opt)} className="accent-primary-600" />
                                <span className="text-sm font-semibold">{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {q.type === "short_text" && (
                          <p className="text-xs text-gray-400 italic">Short answer — student types their response. Graded manually.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex gap-4">
                <button type="button" onClick={() => setTab("quizzes")} className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <><span className="loader !w-5 !h-5 !border-white/30 !border-t-white" /> Saving…</> : `Save Quiz (${questions.length} questions)`}
                </button>
              </div>
            </Form>
          )}

          {/* ── SUBMISSIONS TAB ─────────────────────────────── */}
          {tab === "submissions" && (
            <>
              {/* Toolbar */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Select placeholder="Select quiz" value={selectedQuizId || undefined} onChange={(v) => setSelectedQuizId(v)}
                    style={{ minWidth: 240 }} options={quizzes.map((q) => ({ label: q.title, value: q.id }))} />
                  <Input.Search placeholder="Search by name or roll no…" value={search} onChange={(e) => setSearch(e.target.value)} allowClear style={{ width: 240 }} />
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => loadSubmissions(selectedQuizId)} disabled={!selectedQuizId}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-all disabled:opacity-50 cursor-pointer">
                      <ReloadOutlined /> Refresh
                    </button>
                    <button onClick={handleExportCsv} disabled={!submissions.length}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-xl shadow transition-all disabled:opacity-50 cursor-pointer">
                      <DownloadOutlined /> Export CSV
                    </button>
                  </div>
                </div>
              </div>

              {loadingSubmissions ? (
                <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
                  <span className="loader" /> <span className="text-sm">Loading submissions…</span>
                </div>
              ) : !selectedQuizId ? (
                <div className="border-2 border-dashed border-gray-200 rounded-2xl py-16 text-center text-gray-400">
                  <ExportOutlined className="text-4xl mb-3" />
                  <p className="font-semibold">Select a quiz to view submissions</p>
                </div>
              ) : (
                <>
                  {/* Summary stats */}
                  <div className="grid grid-cols-4 gap-4 mb-5">
                    <StatCard label="Total Attempts" value={submissions.length} />
                    <StatCard label="Completed" value={submissions.filter((s) => s.status === "completed" || s.status === "submitted").length} valueClass="text-green-700" />
                    <StatCard label="Terminated" value={submissions.filter((s) => s.status === "terminated").length} valueClass="text-red-600" />
                    <StatCard label="In Progress" value={submissions.filter((s) => s.status === "started").length} valueClass="text-blue-600" />
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <Table
                      dataSource={filteredSubmissions}
                      columns={submissionColumns}
                      rowKey="id"
                      pagination={{ pageSize: 15, showSizeChanger: false }}
                      scroll={{ x: 800 }}
                      size="middle"
                      locale={{ emptyText: <div className="py-10 text-center text-gray-400">No submissions yet</div> }}
                      rowClassName={(r) => r.status === "terminated" ? "bg-red-50/50" : ""}
                    />
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
}
