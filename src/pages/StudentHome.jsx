import {
  BookOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Form, Input, Select, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/layout/Footer";
import StudentNavbar from "../components/layout/StudentNavbar";
import { fetchQuizzes } from "../services/quizService";

export default function StudentHome() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuizId, setSelectedQuizId] = useState("");

  useEffect(() => {
    fetchQuizzes(true)
      .then((items) => {
        setQuizzes(items);
        if (items.length === 1) setSelectedQuizId(items[0].id);
      })
      .catch((err) => {
        console.error(err);
        if (!import.meta.env.VITE_FIREBASE_DATABASE_URL) {
          message.error("Setup error. Please contact your instructor.");
        } else {
          message.error("Could not load quiz. Please try again.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedQuiz = useMemo(
    () => quizzes.find((q) => q.id === selectedQuizId),
    [quizzes, selectedQuizId]
  );

  function handleStart(values) {
    if (!selectedQuizId) {
      message.error("Please select a quiz first.");
      return;
    }
    navigate(`/quiz/${selectedQuizId}`, {
      state: {
        studentName: values.studentName.trim(),
        rollNo: values.rollNo.trim(),
      },
    });
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex flex-col">
        {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -right-60 w-[500px] h-[500px] bg-primary-100 rounded-full opacity-25 blur-3xl" />
        <div className="absolute -bottom-60 -left-60 w-[500px] h-[500px] bg-blue-100 rounded-full opacity-25 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <StudentNavbar />

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-4xl">

            {/* ── Page heading ── */}
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-4">
                <SafetyCertificateOutlined /> Secure Quiz Platform
              </span>
              <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-3">
                Welcome to <span className="text-primary-600">QuizGuard</span>
              </h1>
              <p className="text-gray-500 text-base max-w-md mx-auto">
                Read each question carefully and answer on your own. Your quiz is monitored.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

              {/* ── Rules sidebar ── */}
              <div className="lg:col-span-2 space-y-3">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Before you start</p>
                {[
                  {
                    icon: <ClockCircleOutlined className="text-primary-600" />,
                    title: "Timer per question",
                    desc: "Each question has its own countdown. Answer before time runs out.",
                  },
                  {
                    icon: <LockOutlined className="text-primary-600" />,
                    title: "Stay in fullscreen",
                    desc: "Leaving fullscreen counts as a violation. 3 violations = quiz ends.",
                  },
                  {
                    icon: <SafetyCertificateOutlined className="text-green-600" />,
                    title: "One attempt only",
                    desc: "Your roll number can only be used once. Choose carefully.",
                  },
                  {
                    icon: <WarningOutlined className="text-amber-500" />,
                    title: "No going back",
                    desc: "Once you move to the next question, you cannot return.",
                  },
                ].map((r) => (
                  <div key={r.title} className="flex items-start gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-4 shadow-sm">
                    <span className="text-lg mt-0.5 flex-shrink-0">{r.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{r.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Form card ── */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-200/80 overflow-hidden">
                  {/* Card header */}
                  <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-6">
                    <h2 className="text-xl font-black text-white">Enter Your Details</h2>
                    <p className="text-white/80 text-sm mt-1">
                      Fill in your name and roll number to start the quiz.
                    </p>
                  </div>

                  <div className="px-8 py-7">
                    {loading ? (
                      <div className="flex items-center justify-center gap-3 py-12 text-gray-400">
                        <span className="loader" />
                        <span className="text-sm font-medium">Loading available quizzes…</span>
                      </div>
                    ) : quizzes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                          <ExclamationCircleOutlined className="text-2xl text-gray-400" />
                        </div>
                        <p className="font-bold text-gray-800">No Quiz Available Right Now</p>
                        <p className="text-sm text-gray-500 max-w-xs">
                          Your instructor hasn't opened a quiz yet. Please check back later or ask your teacher.
                        </p>
                      </div>
                    ) : (
                      <Form form={form} layout="vertical" onFinish={handleStart} requiredMark={false}>

                        {/* Quiz selector */}
                        <Form.Item
                          name="quiz"
                          label={<span className="text-sm font-semibold text-gray-700">Select Your Quiz</span>}
                          rules={[{ required: true, message: "Please select a quiz" }]}
                        >
                          <Select
                            size="large"
                            placeholder="Choose your quiz…"
                            value={selectedQuizId || undefined}
                            onChange={(v) => {
                              setSelectedQuizId(v);
                              form.setFieldValue("quiz", v);
                            }}
                            options={quizzes.map((q) => ({ label: q.title, value: q.id }))}
                          />
                        </Form.Item>

                        {/* Quiz info pills */}
                        {selectedQuiz && (
                          <div className="flex flex-wrap gap-2 mb-5 -mt-2">
                            <span className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 text-xs font-bold px-3 py-1.5 rounded-full border border-primary-200">
                              <BookOutlined /> {selectedQuiz.questionCount || 0} questions
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 text-xs font-bold px-3 py-1.5 rounded-full border border-primary-200">
                              <ClockCircleOutlined /> {selectedQuiz.durationMinutes} min total
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200">
                              <WarningOutlined /> {selectedQuiz.maxViolations || 3} violations allowed
                            </span>
                          </div>
                        )}

                        {/* Name & Roll */}
                        <div className="grid grid-cols-2 gap-4">
                          <Form.Item
                            name="studentName"
                            label={<span className="text-sm font-semibold text-gray-700">Full Name</span>}
                            rules={[
                              { required: true, message: "Please enter your name" },
                              { min: 2, message: "Name is too short" },
                              { max: 80, message: "Name is too long" },
                            ]}
                          >
                            <Input
                              size="large"
                              placeholder="e.g. Ahmed Ali"
                              autoComplete="name"
                            />
                          </Form.Item>
                          <Form.Item
                            name="rollNo"
                            label={<span className="text-sm font-semibold text-gray-700">Roll Number</span>}
                            rules={[
                              { required: true, message: "Please enter your roll number" },
                              { pattern: /^[0-9]+$/, message: "Only numbers (0-9) are allowed" },
                              { max: 20, message: "Roll number too long" },
                            ]}
                          >
                            <Input
                              size="large"
                              placeholder="e.g. 12345"
                              autoComplete="off"
                              onKeyPress={(e) => {
                                // Only allow digits 0-9
                                if (!/[0-9]/.test(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                            />
                          </Form.Item>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-black text-base rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          Begin Quiz →
                        </button>
                        <p className="text-center text-xs text-gray-400 mt-3">
                          The quiz will open in fullscreen mode after you click Begin.
                        </p>
                      </Form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}