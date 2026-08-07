import {
  BookOutlined,
  CheckCircleFilled,
  MessageOutlined,
  SendOutlined,
  StarFilled,
  StarOutlined,
  TeamOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { Form, Input, message } from "antd";
import { useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/layout/Footer";
import StudentNavbar from "../components/layout/StudentNavbar";
import { FEEDBACK_CATEGORIES, RATING_LABELS } from "../lib/constants.js";
import { submitFeedback } from "../services/feedbackService";

const { TextArea } = Input;

const CATEGORIES = [
  {
    key: FEEDBACK_CATEGORIES.EDUCATION,
    label: "Education",
    description: "Content quality, difficulty, curriculum",
    icon: <BookOutlined />,
    color: "primary",
    required: true,
  },
  {
    key: FEEDBACK_CATEGORIES.TEACHER,
    label: "Teacher",
    description: "Teaching style, communication, support",
    icon: <TeamOutlined />,
    color: "green",
    required: false,
  },
  {
    key: FEEDBACK_CATEGORIES.GENERAL,
    label: "Overall Experience",
    description: "Platform, environment, summer camp",
    icon: <TrophyOutlined />,
    color: "amber",
    required: false,
  },
];

const COLOR_SCHEMES = {
  primary: {
    selected: "border-primary-500 bg-primary-50 ring-2 ring-primary-200",
    default: "border-gray-200 hover:border-primary-300 hover:bg-primary-50/40",
    icon: "bg-primary-100 text-primary-600",
    badge: "bg-primary-600 text-white",
  },
  green: {
    selected: "border-green-500 bg-green-50 ring-2 ring-green-200",
    default: "border-gray-200 hover:border-green-300 hover:bg-green-50/40",
    icon: "bg-green-100 text-green-600",
    badge: "bg-green-600 text-white",
  },
  amber: {
    selected: "border-amber-500 bg-amber-50 ring-2 ring-amber-200",
    default: "border-gray-200 hover:border-amber-300 hover:bg-amber-50/40",
    icon: "bg-amber-100 text-amber-600",
    badge: "bg-amber-500 text-white",
  },
};

function StarRating({ value, onChange, size = "lg" }) {
  const [hovered, setHovered] = useState(0);
  const stars = [1, 2, 3, 4, 5];
  const active = hovered || value;
  const sizeCls = size === "lg" ? "text-3xl" : "text-xl";

  return (
    <div className="flex gap-1.5">
      {stars.map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          className={`${sizeCls} transition-all duration-100 hover:scale-110`}
          style={{ background: "none", border: "none", padding: 0 }}
        >
          {s <= active ? (
            <StarFilled style={{ color: "#f59e0b" }} />
          ) : (
            <StarOutlined style={{ color: "#d1d5db" }} />
          )}
        </button>
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const [form] = Form.useForm();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [ratings, setRatings] = useState({ education: 0, teacher: 0, general: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(values) {
    if (!selectedCategory) {
      message.error("Please select at least one feedback category.");
      return;
    }
    if (!ratings[selectedCategory]) {
      message.error("Please provide a star rating.");
      return;
    }
    setSubmitting(true);
    try {
      await submitFeedback({
        name: values.name.trim(),
        category: selectedCategory,
        rating: ratings[selectedCategory],
        message: values.message?.trim() || "",
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      message.error("Could not submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex flex-col">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-60 -right-60 w-[500px] h-[500px] bg-primary-100 rounded-full opacity-25 blur-3xl" />
          <div className="absolute -bottom-60 -left-60 w-[500px] h-[500px] bg-blue-100 rounded-full opacity-25 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col flex-1">
          <StudentNavbar />
          <main className="flex-1 flex items-center justify-center px-4 py-12">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <CheckCircleFilled style={{ fontSize: 48, color: "#16a34a" }} />
              </div>
              <h1 className="text-3xl font-black text-gray-900 mb-3">
                Thank You! 🎉
              </h1>
              <p className="text-gray-500 text-base mb-8">
                Your feedback has been submitted successfully. We truly appreciate you taking the time to share your thoughts.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    setSubmitted(false);
                    form.resetFields();
                    setSelectedCategory("");
                    setRatings({ education: 0, teacher: 0, general: 0 });
                  }}
                  className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all"
                >
                  Submit Another
                </button>
                <Link
                  to="/"
                  className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold rounded-2xl hover:from-primary-700 hover:to-primary-800 transition-all text-center"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
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
          <div className="w-full max-w-2xl">

            {/* Page heading */}
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-4">
                <MessageOutlined /> Share Your Thoughts
              </span>
              <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-3">
                Your <span className="text-primary-600">Feedback</span> Matters
              </h1>
              <p className="text-gray-500 text-base max-w-md mx-auto">
                Help us improve the summer camp experience. Your honest response is valued.
              </p>
            </div>

            {/* Form card */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200/80 overflow-hidden">
              {/* Card header */}
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-6">
                <h2 className="text-xl font-black text-white">Feedback Form</h2>
                <p className="text-white/80 text-sm mt-1">
                  Select a category, rate your experience, and leave a message.
                </p>
              </div>

              <div className="px-8 py-8">
                <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>

                  {/* Name */}
                  <Form.Item
                    name="name"
                    label={<span className="text-sm font-semibold text-gray-700">Your Name</span>}
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

                  {/* Category selection */}
                  <div className="mb-6">
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      Feedback Category <span className="text-red-500">*</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {CATEGORIES.map((cat) => {
                        const isSelected = selectedCategory === cat.key;
                        const colors = COLOR_SCHEMES[cat.color] || COLOR_SCHEMES.primary;

                        return (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => setSelectedCategory(cat.key)}
                            className={`relative flex flex-col items-start p-4 rounded-2xl border-2 transition-all duration-200 text-left ${isSelected ? colors.selected : colors.default
                              }`}
                          >
                            {cat.required && (
                              <span className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                                Required
                              </span>
                            )}
                            <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-base mb-2 ${colors.icon}`}>
                              {cat.icon}
                            </span>
                            <p className="font-bold text-gray-900 text-sm">{cat.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{cat.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Star Rating — shows when a category is selected */}
                  {selectedCategory && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-3">
                        Rate your{" "}
                        <span className="text-primary-600">
                          {CATEGORIES.find((c) => c.key === selectedCategory)?.label}
                        </span>{" "}
                        experience
                      </p>
                      <StarRating
                        value={ratings[selectedCategory]}
                        onChange={(v) =>
                          setRatings((prev) => ({ ...prev, [selectedCategory]: v }))
                        }
                      />
                      {ratings[selectedCategory] > 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                          {RATING_LABELS[ratings[selectedCategory]]}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Message */}
                  <Form.Item
                    name="message"
                    label={<span className="text-sm font-semibold text-gray-700">Your Message</span>}
                    rules={[
                      { max: 1000, message: "Message too long (max 1000 characters)" },
                    ]}
                  >
                    <TextArea
                      rows={4}
                      placeholder="Share your thoughts, suggestions, or anything you'd like us to know…"
                      showCount
                      maxLength={1000}
                      style={{ resize: "none", borderRadius: 12 }}
                    />
                  </Form.Item>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:from-gray-300 disabled:to-gray-400 text-white font-black text-base rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <span className="loader !w-5 !h-5 !border-2 !border-white/30 ![border-top-color:white]" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <SendOutlined /> Submit Feedback
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-gray-400 mt-3">
                    Your response is anonymous to other students and will only be reviewed by the admin.
                  </p>
                </Form>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}