# Firebase Quiz Guard - Production MCQ Examination System

A production-ready, secure MCQ examination system built with React, Vite, Ant Design, and Firebase Realtime Database. Features strict anti-cheating measures, fullscreen enforcement, violation tracking, and comprehensive admin controls.

## Features

### Student Quiz Experience
- **One Attempt Per Roll Number**: Enforced using Firebase transactions
- **Strict Anti-Cheating System**:
  - Fullscreen mode enforcement
  - Tab switch detection
  - Window blur detection
  - Keyboard activity monitoring
  - Right-click prevention
  - Copy/paste blocking
  - Developer tools prevention
  - Automatic violation recording with timestamps
- **Question Timer**: Each question has its own 45-second countdown
- **Overall Quiz Timer**: Complete quiz timer with auto-submission
- **One Question at a Time**: No navigation to previous questions
- **Auto-Submission**: Automatically submits when time ends or violation limit reached
- **State Persistence**: Recovers from accidental page reloads
- **Real-time Violation Warnings**: Visual feedback for each violation

### Admin Dashboard
- **Quiz Management**:
  - Create unlimited quizzes
  - Add unlimited MCQ questions
  - Set individual question marks
  - Set question time limits (default 45 seconds)
  - Set maximum violation limit (default 3)
  - Randomize question order
  - Randomize answer options
  - Configure score visibility
  - Publish/unpublish quizzes
  - Duplicate quizzes
  - Delete quizzes
- **Submission Dashboard**:
  - View all student submissions
  - See detailed violation history
  - Track answered/unanswered questions
  - View correct/wrong answers
  - Calculate scores automatically
  - Filter by quiz and status
  - Search by name or roll number
  - Export results to CSV
  - Reset attempts with confirmation
  - View detailed submission reviews
- **Security**: Admin-only access with Firebase Authentication

## Tech Stack

- **Frontend**: React 18 + Vite
- **UI Library**: Ant Design 5
- **Routing**: React Router 6
- **Backend**: Firebase Realtime Database
- **Authentication**: Firebase Authentication
- **Hosting**: Firebase Hosting

## Prerequisites

- Node.js 18+ and npm
- Firebase account with Realtime Database enabled
- Git (for version control)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd firebase-quiz-guard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Realtime Database** (not Firestore)
4. Enable **Firebase Authentication** with Email/Password provider

#### Get Firebase Configuration
1. Go to Project Settings > General
2. Scroll to "Your apps" section
3. Click "Add app" and select Web (</>)
4. Copy the Firebase configuration object

#### Configure Environment Variables
1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```
2. Fill in your Firebase configuration in `.env`:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

#### Set Up Database Rules
1. Go to Firebase Console > Realtime Database > Rules
2. Replace the rules with the content from `database.rules.json`
3. Click "Publish"

#### Create Admin User
1. Go to Firebase Console > Authentication > Users
2. Add a new user with email and password
3. Copy the User UID
4. Go to Realtime Database
5. Create a new node: `/admins/{rfFv1Gx3AqQ8BlpbWXcqgDoxNMD3}`
6. Add a child property: `role: "admin"`
7. Your database should look like:
   ```
   {
     "admins": {
       "abc123xyz...": {
         "role": "admin",
         "email": "admin@example.com"
       }
     }
   }
   ```

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Building for Production

Build the project:

```bash
npm run build
```

This creates an optimized production build in the `dist` folder.

Preview the production build locally:

```bash
npm run preview
```

## Deployment to Firebase Hosting

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Initialize Firebase Hosting

```bash
firebase init hosting
```

- Select your Firebase project
- Use `dist` as the public directory
- Configure as a single-page app: Yes
- Set up automatic builds with GitHub: No (optional)
- Don't overwrite `dist/index.html`

### 4. Deploy

Build and deploy:

```bash
npm run build
firebase deploy --only hosting
```

Or use the combined command:

```bash
npm run deploy
```

Your app will be live at: `https://your-project-id.web.app`

## Usage

### Admin Access
1. Go to `/admin/login`
2. Sign in with your admin credentials
3. Access the admin dashboard

### Student Access
1. Go to the home page (`/`)
2. Select a published quiz
3. Enter name and roll number
4. Read instructions carefully
5. Click "Begin Quiz" to enter fullscreen mode
6. Complete the quiz

### Creating a Quiz
1. Login as admin
2. Navigate to "Create quiz" tab
3. Fill in quiz details:
   - Title and description
   - Duration in minutes
   - Question time limit (default 45 seconds)
   - Maximum violations (default 3)
4. Add questions with options
5. Mark correct answers
6. Set points for each question
7. Save the quiz
8. Publish when ready

### Managing Submissions
1. Go to "Submissions" tab
2. Select a quiz from the dropdown
3. View all student submissions
4. Click "Review" to see detailed answers and violations
5. Export to CSV for analysis
6. Reset attempts if needed (with confirmation)

## Database Structure

```
{
  "admins": {
    "{uid}": {
      "role": "admin",
      "email": "admin@example.com"
    }
  },
  "quizzes": {
    "{quizId}": {
      "title": "Quiz Title",
      "description": "Quiz description",
      "durationMinutes": 60,
      "questionTimeSeconds": 45,
      "maxViolations": 3,
      "randomizeQuestions": false,
      "randomizeOptions": false,
      "showScoreToStudent": false,
      "isPublished": true,
      "questionCount": 35,
      "createdAt": {...},
      "updatedAt": {...}
    }
  },
  "quizQuestions": {
    "{quizId}": {
      "{questionId}": {
        "type": "mcq",
        "prompt": "Question text",
        "options": ["A", "B", "C", "D"],
        "points": 1,
        "timeSeconds": 45,
        "order": 0
      }
    }
  },
  "answerKeys": {
    "{quizId}": {
      "{questionId}": {
        "correctAnswer": "A"
      }
    }
  },
  "attempts": {
    "{quizId}": {
      "{normalizedRollNumber}": {
        "studentName": "John Doe",
        "rollNo": "AGC-012",
        "rollNoKey": "agc012",
        "status": "started",
        "startedAt": {...},
        "clientStartedAt": 1234567890,
        "questionCount": 35,
        "violationCount": 0
      }
    }
  },
  "submissions": {
    "{quizId}": {
      "{submissionId}": {
        "quizId": "{quizId}",
        "rollNoKey": "agc012",
        "studentName": "John Doe",
        "rollNo": "AGC-012",
        "status": "completed",
        "answers": [
          {
            "questionId": "{questionId}",
            "answer": "Option A",
            "timeSpent": 23,
            "timedOut": false
          }
        ],
        "answeredCount": 30,
        "unansweredCount": 5,
        "violationCount": 2,
        "autoSubmitted": false,
        "submitReason": "student",
        "terminationReason": null,
        "startedAt": {...},
        "submittedAt": {...},
        "totalTimeSeconds": 1800
      }
    }
  },
  "violations": {
    "{quizId}": {
      "{submissionId}": {
        "{violationId}": {
          "type": "tab_switch",
          "message": "You switched tabs",
          "questionIndex": 5,
          "questionId": "{questionId}",
          "currentQuestionTime": 12,
          "violationCount": 1,
          "timestamp": {...},
          "clientTimestamp": 1234567890
        }
      }
    }
  }
}
```

## Security Features

### Database Rules
- Admins have full read/write access to all data
- Students require authentication for all operations
- Answer keys are only readable by admins
- One attempt per roll number enforced at database level
- Submissions can only be created, not modified
- Violations are write-once, read-only

### Anti-Cheating Measures
- Fullscreen enforcement with exit detection
- Tab/window switch detection
- Keyboard activity monitoring
- Right-click blocking
- Copy/paste prevention
- Developer tools blocking (F12, Ctrl+Shift+I, etc.)
- View source prevention
- All violations recorded with timestamps
- Automatic quiz termination after violation limit

### Data Integrity
- Firebase server timestamps prevent time manipulation
- Transaction-based attempt creation prevents duplicates
- Client-side timer recovery from page reloads
- Validation at both client and database levels

## Troubleshooting

### Build Errors
- Ensure all dependencies are installed: `npm install`
- Clear node_modules and reinstall: `rmdir /s /q node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)

### Firebase Connection Issues
- Verify `.env` file has correct Firebase configuration
- Check Firebase project has Realtime Database enabled
- Ensure database rules are published
- Verify admin user exists in `/admins/{uid}` path

### Authentication Issues
- Check Firebase Authentication is enabled
- Verify Email/Password provider is enabled
- Ensure admin user is created in Authentication tab
- Confirm admin UID is added to `/admins` in database

### Student Cannot Start Quiz
- Verify quiz is published (`isPublished: true`)
- Check student hasn't already started/submitted
- Ensure student is authenticated (anonymous auth)
- Check browser allows fullscreen mode

### Violations Not Recording
- Verify student session has submissionId
- Check `/violations/{quizId}/{submissionId}` path exists
- Ensure database rules allow violation writes
- Check browser console for errors

## License

This project is provided as-is for educational and institutional use.

## Support

For issues, questions, or contributions, please contact your system administrator or project maintainer.
