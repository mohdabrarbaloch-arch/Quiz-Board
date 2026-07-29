import { Form, Input, message } from "antd";
import { child, get, ref } from "firebase/database";
import { useState } from "react";
import StudentNavbar from "../components/layout/StudentNavbar";
import Footer from "../components/layout/Footer";
import { db } from "../lib/firebase";
import { calculateObjectiveScore } from "../lib/quiz";

export default function ViewResult() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [form] = Form.useForm();

  const SMIT_BLUE = "#1565C0";
  const SMIT_GREEN = "#43A047";

  async function handleSearch(values) {
    const rollNo = values.rollNo.trim();
    if (!rollNo) return;

    setLoading(true);
    setResult(null);

    try {
      // Search through all quizzes for this roll number
      const quizzesSnapshot = await get(child(ref(db), "quizzes"));
      if (!quizzesSnapshot.exists()) {
        message.error("No quizzes found");
        setLoading(false);
        return;
      }

      let foundSubmission = null;
      let foundQuiz = null;

      // Iterate through each quiz
      quizzesSnapshot.forEach((quizSnapshot) => {
        if (foundSubmission) return; // Already found, skip

        const quizId = quizSnapshot.key;
        const quizData = quizSnapshot.val();
        foundQuiz = { id: quizId, ...quizData };
      });

      // Now search all submissions across all quizzes
      const allSubmissionsSnapshot = await get(child(ref(db), "submissions"));
      
      if (!allSubmissionsSnapshot.exists()) {
        message.warning("No submissions found in the system");
        setLoading(false);
        return;
      }

      // Search through each quiz's submissions
      allSubmissionsSnapshot.forEach((quizSubmissionsSnapshot) => {
        if (foundSubmission) return; // Already found
        
        const quizId = quizSubmissionsSnapshot.key;
        
        quizSubmissionsSnapshot.forEach((subSnapshot) => {
          if (foundSubmission) return; // Already found
          
          const submission = subSnapshot.val();
          if (submission.rollNo && submission.rollNo.toLowerCase() === rollNo.toLowerCase()) {
            foundSubmission = { id: subSnapshot.key, quizId: quizId, ...submission };
            
            // Get the quiz details for this submission
            quizzesSnapshot.forEach((quizSnap) => {
              if (quizSnap.key === quizId) {
                foundQuiz = { id: quizSnap.key, ...quizSnap.val() };
              }
            });
          }
        });
      });

      if (!foundSubmission) {
        message.warning("No result found for this roll number");
        setLoading(false);
        return;
      }

      console.log("Found submission:", foundSubmission);

      // Get the quiz details including questions and answer keys
      if (!foundQuiz) {
        message.error("Quiz data not found");
        setLoading(false);
        return;
      }

      // Fetch the full quiz data with questions and answer keys
      // Questions are stored at "quizQuestions/{quizId}" and answer keys at "answerKeys/{quizId}"
      const questionsSnapshot = await get(child(ref(db), `quizQuestions/${foundSubmission.quizId}`));
      const answerKeysSnapshot = await get(child(ref(db), `answerKeys/${foundSubmission.quizId}`));
      
      const questions = [];
      const answerKeys = [];
      
      if (questionsSnapshot.exists()) {
        questionsSnapshot.forEach((qSnap) => {
          questions.push({ id: qSnap.key, ...qSnap.val() });
        });
        // Sort by order
        questions.sort((a, b) => (a.order || 0) - (b.order || 0));
      }
      
      if (answerKeysSnapshot.exists()) {
        answerKeysSnapshot.forEach((aSnap) => {
          answerKeys.push({ id: aSnap.key, ...aSnap.val() });
        });
      }

      console.log("Quiz ID:", foundSubmission.quizId);
      console.log("Questions:", questions.length);
      console.log("Answer Keys:", answerKeys.length);
      console.log("Submission answers:", foundSubmission.answers?.length || 0);
      console.log("Full submission:", foundSubmission);
      
      // Log sample data for debugging
      if (foundSubmission.answers && foundSubmission.answers.length > 0) {
        console.log("Sample answer:", foundSubmission.answers[0]);
      }
      if (answerKeys.length > 0) {
        console.log("Sample answer key:", answerKeys[0]);
      }
      if (questions.length > 0) {
        console.log("Sample question:", questions[0]);
      }

      // Calculate score properly using the quiz.js function
      let scoreResult = null;
      
      // Check if we have the necessary data
      if (!foundSubmission.answers || foundSubmission.answers.length === 0) {
        console.error("No answers found in submission");
        message.warning("This submission has no answers recorded");
      } else if (questions.length === 0) {
        console.error("No questions found for this quiz");
        message.warning("Quiz questions not found");
      } else if (answerKeys.length === 0) {
        console.error("No answer keys found for this quiz");
        message.warning("Answer keys not found for this quiz");
      } else {
        // All data is available, calculate the score
        try {
          const calculatedScore = calculateObjectiveScore(foundSubmission, questions, answerKeys);
          
          const { score, maximum, correct, wrong } = calculatedScore;
          const pct = maximum > 0 ? Math.round((score / maximum) * 100) : 0;
          const passed = pct >= 70; // 70% or higher is a pass

          scoreResult = { score, maximum, correct, wrong, pct, passed };
          console.log("Calculated score:", scoreResult);
          console.log(`Pass status: ${passed ? 'PASS' : 'FAIL'} (${pct}% >= 70%)`);
        } catch (error) {
          console.error("Error calculating score:", error);
          message.error("Failed to calculate score");
        }
      }

      setResult({
        submission: foundSubmission,
        quiz: foundQuiz,
        scoreResult,
      });
      
      message.success("Result found successfully!");
    } catch (error) {
      console.error("Error fetching result:", error);
      message.error("Failed to fetch result. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const displayName = result?.submission?.studentName
    ? result.submission.studentName
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
    : "";

  const isTerminated = result?.submission?.status === "terminated";
  const passed = result?.scoreResult?.passed ?? false;
  const pct = result?.scoreResult?.pct ?? 0;
  const themeColor = isTerminated ? "#64748b" : passed ? SMIT_GREEN : "#dc2626";

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
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black text-gray-900 mb-2">View Your Result</h1>
              <p className="text-gray-600">Enter your roll number to see your quiz result</p>
            </div>

        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-6">
          <Form form={form} onFinish={handleSearch} layout="vertical">
            <Form.Item
              name="rollNo"
              label={<span className="text-sm font-semibold text-gray-700">Roll Number</span>}
              rules={[
                { required: true, message: "Please enter your roll number" },
                { pattern: /^[0-9]+$/, message: "Only numbers are allowed" },
              ]}
            >
              <Input
                size="large"
                placeholder="Enter your roll number"
                autoComplete="off"
                disabled={loading}
              />
            </Form.Item>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-black text-base rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Searching..." : "Search Result"}
            </button>
          </Form>
        </div>

        {/* Result Card */}
        {result && (
          <div style={{ borderRadius:16, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,0.1)", fontFamily:"Arial,sans-serif", background:"#ffffff", border:"1px solid #e2e8f0" }}>
            <div style={{ padding:"28px 32px" }}>
              {/* SMIT Logo */}
              <div style={{ textAlign:"center", marginBottom:20 }}>
                <img 
                  src="/logo.png" 
                  alt="SMIT Logo" 
                  style={{ height:38, width:"auto", display:"inline-block" }}
                />
                <h2 style={{ fontSize:13, fontWeight:700, color:"#1565C0", margin:"10px 0 0", letterSpacing:"0.12em", textTransform:"uppercase" }}>
                  Saylani Mass IT Training
                </h2>
              </div>

              {/* Pass/Fail Status */}
              <div style={{ textAlign:"center", marginBottom:20 }}>
                <div style={{ display:"inline-block", background:themeColor, color:"#ffffff", fontSize:24, fontWeight:900, padding:"8px 32px", borderRadius:6, letterSpacing:"0.08em" }}>
                  {isTerminated ? "VOID" : passed ? "PASS" : "FAIL"}
                </div>
                <p style={{ fontSize:12, color:"#64748b", margin:"8px 0 0", fontWeight:500 }}>
                  {isTerminated ? "Quiz terminated due to violations"
                    : passed ? "Congratulations! You have successfully passed"
                    : "Better luck next time"}
                </p>
              </div>

              {/* Student Details */}
              <div style={{ background:"#f8fafc", border:"2px solid #e2e8f0", borderRadius:10, padding:"14px 18px", marginBottom:20 }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ fontSize:11, color:"#64748b", fontWeight:600, padding:"4px 0", textTransform:"uppercase", letterSpacing:"0.05em" }}>Student Name</td>
                      <td style={{ fontSize:14, color:"#0f172a", fontWeight:700, textAlign:"right", padding:"4px 0" }}>{displayName}</td>
                    </tr>
                    <tr>
                      <td style={{ fontSize:11, color:"#64748b", fontWeight:600, padding:"4px 0", textTransform:"uppercase", letterSpacing:"0.05em" }}>Roll Number</td>
                      <td style={{ fontSize:14, color:"#0f172a", fontWeight:700, textAlign:"right", padding:"4px 0" }}>{result.submission.rollNo.toUpperCase()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {result.scoreResult ? (
                <>
                  {/* Score Percentage */}
                  <div style={{ textAlign:"center", marginBottom:18 }}>
                    <div style={{ fontSize:48, fontWeight:900, color:themeColor, lineHeight:1, marginBottom:4 }}>
                      {pct}%
                    </div>
                    <div style={{ fontSize:11, color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                      Total Score
                    </div>
                  </div>

                  {/* Score Details Table */}
                  <div style={{ marginBottom:18 }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", border:"2px solid #e2e8f0", borderRadius:10, overflow:"hidden" }}>
                      <tbody>
                        <tr style={{ background:"#f8fafc" }}>
                          <td style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", padding:"10px 16px", borderBottom:"1px solid #e2e8f0", letterSpacing:"0.05em" }}>Total Score</td>
                          <td style={{ fontSize:16, color:"#0f172a", fontWeight:900, textAlign:"right", padding:"10px 16px", borderBottom:"1px solid #e2e8f0" }}>{result.scoreResult.score} / {result.scoreResult.maximum}</td>
                        </tr>
                        <tr style={{ background:"#ffffff" }}>
                          <td style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", padding:"10px 16px", borderBottom:"1px solid #e2e8f0", letterSpacing:"0.05em" }}>Correct Answers</td>
                          <td style={{ fontSize:16, color:SMIT_GREEN, fontWeight:900, textAlign:"right", padding:"10px 16px", borderBottom:"1px solid #e2e8f0" }}>{result.scoreResult.correct}</td>
                        </tr>
                        <tr style={{ background:"#f8fafc" }}>
                          <td style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", padding:"10px 16px", borderBottom:"1px solid #e2e8f0", letterSpacing:"0.05em" }}>Wrong Answers</td>
                          <td style={{ fontSize:16, color:"#dc2626", fontWeight:900, textAlign:"right", padding:"10px 16px", borderBottom:"1px solid #e2e8f0" }}>{result.scoreResult.wrong}</td>
                        </tr>
                        <tr style={{ background:"#ffffff" }}>
                          <td style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", padding:"10px 16px", letterSpacing:"0.05em" }}>Passing Marks</td>
                          <td style={{ fontSize:16, color:"#0f172a", fontWeight:900, textAlign:"right", padding:"10px 16px" }}>70%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div style={{ background:"#fef2f2", border:"2px solid #fca5a5", borderRadius:10, padding:"20px", textAlign:"center", marginBottom:18 }}>
                  <p style={{ fontSize:14, color:"#991b1b", fontWeight:600, margin:0 }}>
                    ⚠️ Score data is not available
                  </p>
                  <p style={{ fontSize:12, color:"#dc2626", margin:"8px 0 0" }}>
                    {result.submission.answers && result.submission.answers.length > 0 
                      ? "Quiz questions or answer keys are missing from the system."
                      : "This submission has no recorded answers."}
                  </p>
                  {result.submission.answeredCount !== undefined && (
                    <p style={{ fontSize:12, color:"#64748b", margin:"8px 0 0" }}>
                      Questions answered: {result.submission.answeredCount}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
