export const sampleQuiz = {
  title: "Testing",
  description:
    "Answer all questions. Each question has 45 seconds. Do not open another tab or leave full screen.",
  durationMinutes: 50,
  questionTimeSeconds: 45,
  maxViolations: 3,
  randomizeQuestions: false,
  randomizeOptions: false,
  showScoreToStudent: false,
  isPublished: false,

  questions: [
    {
      type: "mcq",
      prompt: "What is Roblox Studio used for?",
      options: [
        "Making games",
        "Writing emails",
        "Watching movies",
        "Editing photos",
      ],
      correctAnswer: "Making games",
      points: 1,
    },
  ],
};