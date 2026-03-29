# ILDCE - Practical Usage Examples
## Real-world scenarios and code samples

---

## 🎯 SCENARIO 1: Teacher Uploads Content on "Algebra - Linear Equations"

### Step 1: Teacher Goes to Dashboard
```
URL: /teacher/ildce?classId=class_KG_A&teacherId=teacher_001
```

### Step 2: Upload Form
```typescript
Form Input:
{
  topic_name: "Linear Equations in One Variable",
  category: "Algebra",
  difficulty_weight: 3,
  content_type: "text",
  content_text: `
    A linear equation is an algebraic equation in which each term is either a constant 
    or the product of a constant and a single variable. Linear equations can be solved 
    to find the value of the variable.
    
    Standard form: ax + b = c
    
    Example 1: 2x + 5 = 13
    Solution: 
    2x = 13 - 5
    2x = 8
    x = 4
    
    Key concepts to master:
    - Moving terms across equality
    - Isolating variables
    - Checking solutions
  `
}
```

### Step 3: Backend Processing (POST /api/ildce/topics)
```javascript
// Request
POST /api/ildce/topics
{
  teacherId: "teacher_001",
  classId: "class_KG_A",
  topic_name: "Linear Equations in One Variable",
  content_text: "...",
  category: "Algebra",
  difficulty_weight: 3,
  content_type: "text"
}

// AI Processing (OpenAI)
// ✅ Creates summary
// ✅ Extracts key points: ["Isolation", "Solutions", "Verification", ...]
// ✅ Generates quiz questions
// ✅ Detects concepts: ["Variables", "Coefficients", "Equality", ...]

// Database Storage
Topic {
  _id: ObjectId("topic_algebra_01"),
  teacherId: "teacher_001",
  classId: "class_KG_A",
  topic_name: "Linear Equations in One Variable",
  content_text: "...",
  ai_summary: "Learn how to solve linear equations...",
  ai_key_points: ["Isolation technique", "Validation", ...],
  concepts: ["Variables", "Coefficients", "Equality", ...],
  ai_formulas: [
    {
      formula: "ax + b = c",
      explanation: "Standard form of linear equation"
    }
  ]
}

Quiz {
  _id: ObjectId("quiz_algebra_01"),
  topicId: ObjectId("topic_algebra_01"),
  title: "Linear Equations in One Variable - Auto-Generated Quiz",
  is_ai_generated: true,
  total_questions: 10,
  questions: [
    {
      question_text: "Solve: 2x + 5 = 13",
      question_type: "short_answer",
      correct_answer: "4",
      difficulty: 2,
      concept_tag: "Isolation",
      explanation: "Move 5 to right side..."
    },
    {
      question_text: "What does 'x' represent in ax + b = c?",
      question_type: "mcq",
      options: ["A) Constant", "B) Variable", "C) Coefficient", "D) Intercept"],
      correct_answer: "B) Variable",
      difficulty: 1,
      concept_tag: "Variables",
      explanation: "x is the unknown variable..."
    },
    // ... 8 more questions
  ]
}

// Response
{
  topic: { _id: "topic_algebra_01", ... },
  quiz: { _id: "quiz_algebra_01", ... },
  ai_processing: {
    summary: "...",
    key_points: ["Isolation", "Validation", ...],
    concepts: ["Variables", "Coefficients", "Equality", "Solutions"],
    formulas: [...]
  }
}
```

### Step 4: Teacher Views Dashboard
```
Class Overview Table shows:
┌─────────────────────────────────────────────────────────┐
│ Topic                 │ Mastery │ Difficulty │ Attempts │
├─────────────────────────────────────────────────────────┤
│ Linear Equations      │  0%     │ 0%        │ 0        │
│ (Just created)        │         │           │          │
└─────────────────────────────────────────────────────────┘
```

---

## 👨‍🎓 SCENARIO 2: Student Takes Quiz

### Step 1: Student Navigates to Quiz
```
URL: /student/quiz?quizId=quiz_algebra_01&classId=class_KG_A&studentId=student_001
```

### Step 2: Student Attempts Quiz
```
Question 1: "Solve: 2x + 5 = 13"
Student answers: "3" ❌ (Correct: "4")

Question 2: "What does 'x' represent?"
Student answers: "B) Variable" ✅

Question 3: "True/False: 2x + 5 = 13 means x = 4"
Student answers: "True" ✅

... (10 questions total)

Final Score: 7/10 = 70%
Time spent: 12 minutes
```

### Step 3: Submit Quiz (POST /api/ildce/quiz-attempt)
```javascript
// Request
POST /api/ildce/quiz-attempt
{
  studentId: "student_001",
  quizId: "quiz_algebra_01",
  topicId: "topic_algebra_01",
  classId: "class_KG_A",
  answers: [
    {
      questionId: 0,
      student_answer: "3",
      correct_answer: "4",
      concept_tag: "Isolation",
      time_spent: 90
    },
    {
      questionId: 1,
      student_answer: "B) Variable",
      correct_answer: "B) Variable",
      concept_tag: "Variables",
      time_spent: 30
    },
    // ... 8 more
  ],
  time_spent: 720 // 12 minutes
}

// Math Engine Calculations
mastery_score = (7/10) * difficulty_weight / average_difficulty
             = 0.70

concept_performance = {
  "Isolation": { score: 4, attempts: 5 },
  "Variables": { score: 2, attempts: 2 },
  "Equality": { score: 1, attempts: 1 }
}

// Database Storage
StudentQuizAttempt {
  _id: ObjectId("attempt_001"),
  studentId: "student_001",
  quizId: "quiz_algebra_01",
  topicId: "topic_algebra_01",
  classId: "class_KG_A",
  total_questions: 10,
  correct_answers: 7,
  score: 7,
  percentage: 70,
  time_spent: 720,
  attempt_number: 1,
  timestamp: Date.now()
}

StudentMetrics {
  _id: ObjectId("metrics_student001_topic01"),
  studentId: "student_001",
  topicId: "topic_algebra_01",
  classId: "class_KG_A",
  mastery_score: 0.70,
  learning_velocity: 0,  // First attempt
  engagement_index: 0.65, // Good engagement
  quiz_attempts: 1,
  total_time_spent: 720
}

// Response
{
  attempt: { ... },
  metrics: {
    mastery_score: 0.70,
    learning_velocity: 0,
    engagement_index: 0.65
  },
  message: "Quiz attempt recorded successfully"
}
```

### Step 4: Student Sees Results
```
✅ Quiz Completed!

Score: 70%

📊 Concept-wise Performance:
- Isolation: 4/5 ✅
- Variables: 2/2 ✅
- Equality: 1/1 ✅
```

---

## 📊 SCENARIO 3: Teacher Reviews Class Analytics

### Step 1: After Multiple Students Take Quiz
```
Class now has:
- 25 students enrolled
- 18 students attempted quiz
- Score range: 45% - 95%
```

### Step 2: Teacher Clicks "Overview" Tab
```
Dashboard View:
┌──────────────────────────────────────────┐
│ Total Topics: 5                          │
│ Avg Class Mastery: 68%                   │
│ Total Quiz Attempts: 45                  │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Topic                 │ Avg Mastery │ Difficulty │ Entropy       │
├──────────────────────────────────────────────────────────────────┤
│ Linear Equations      │ 70%         │ 30%        │ Balanced      │
│ Quadratic Equations   │ 45%         │ 65%        │ Polarized ⚠️  │
│ Functions             │ 72%         │ 25%        │ Balanced      │
│ Polynomials           │ 52%         │ 50%        │ Normal        │
│ Graphing              │ 68%         │ 40%        │ Balanced      │
└──────────────────────────────────────────────────────────────────┘
```

### Step 3: Math Engine Calculations (GET /api/ildce/metrics/class-topics)
```javascript
// For "Linear Equations" topic:

// Mastery Calculation
mastery_scores = [0.70, 0.75, 0.65, 0.80, 0.72, ...]
class_avg_mastery = average(mastery_scores) = 0.70

// Dynamic Difficulty
total_attempts = 45
total_correct = 32
dynamic_difficulty = 1 - (32/45) = 0.29 ❌ Easy

// Class Entropy
mastery_distribution = {
  weak: 3,      // < 0.4
  moderate: 12, // 0.4-0.7
  strong: 3     // > 0.7
}
entropy = -(3/18)*log(3/18) - (12/18)*log(12/18) - (3/18)*log(3/18)
        = 0.89 ✅ Balanced

// Learning Velocity (for each student)
// If 2nd attempt:
velocity = (current_mastery - previous_mastery) / days_elapsed
         = (0.75 - 0.70) / 1 = +0.05 ✅ Improving

// Alerts Generation
alerts = [
  {
    alert_type: "low_mastery",
    severity: "medium",
    description: "Quadratic Equations mastery low (45%)"
  },
  {
    alert_type: "difficulty_rise",
    severity: "medium",
    description: "Quadratic Equations difficulty high (65%)"
  }
]

// Storage
TopicMetrics {
  topicId: "topic_algebra_01",
  classId: "class_KG_A",
  class_avg_mastery: 0.70,
  dynamic_difficulty: 0.29,
  entropy: 0.89,
  mastery_distribution: { weak: 3, moderate: 12, strong: 3 },
  students_improving: 14,
  students_declining: 2,
  avg_engagement: 0.65,
  alerts: [...]
}
```

### Step 4: Teacher Sees Alerts
```
⚠️ System Alerts:
  1. Quadratic Equations: Class mastery low (45%)
     → Consider: Reteach core concepts
  
  2. Quadratic Equations: Difficulty rising (65%)
     → 12 students struggling
     → Recommend: Practice problems, extended examples
  
  3. 2 students declining in Linear Equations
     → John: -0.05 velocity (from 75% → 70%)
     → Maria: -0.08 velocity (from 60% → 52%)
     → Action: 1-on-1 review scheduled
```

---

## 🔮 SCENARIO 4: Knowledge Decay Predictions (Phase 3)

### Step 1: System Predicts When Students Will Forget
```javascript
// For student who scored 70% on Linear Equations
// Last attempt: Today (Feb 20, 2026)

Knowledge(t) = K₀ × e^(-λ × Δt)
K₀ = 0.70 (mastery score)
λ = 0.05 (forgetting constant)

After 7 days: K(7) = 0.70 × e^(-0.05 × 7) = 0.51 ⚠️
After 10 days: K(10) = 0.70 × e^(-0.05 × 10) = 0.42 🔴

Alert threshold: K < 0.6 means student should revise
Predicted revision date: Feb 27 (7 days)

// Response from GET /api/ildce/metrics/knowledge-decay
{
  students: [
    {
      student: { name: "John", email: "john@school.com" },
      mastery_score: 0.70,
      predicted_decay: 0.51,
      predicted_drop_date: "2026-02-27",
      recommendation: "⚠️ Schedule revision in 7 days",
      needs_revision: true
    },
    {
      student: { name: "Maria", ... },
      mastery_score: 0.85,
      predicted_decay: 0.68,
      predicted_drop_date: "2026-03-02",
      recommendation: "Monitor - still strong",
      needs_revision: false
    }
  ],
  urgent_revisions_needed: 8
}
```

### Step 2: Teacher Views Knowledge Decay Panel
```
🧠 Knowledge Decay Predictions

⚠️ Students Need Revision (8):
┌────────────┬──────────┬─────────────────┐
│ Student    │ Current  │ Revision Due    │
├────────────┼──────────┼─────────────────┤
│ John       │ 51%      │ Feb 27 (URGENT) │
│ Maria      │ 48%      │ Feb 25 (URGENT) │
│ Ahmed      │ 62%      │ Mar 1 (Soon)    │
│ ...        │ ...      │ ...             │
└────────────┴──────────┴─────────────────┘

✅ Still Strong (10):
- Sarah (85% - Next review Mar 5)
- Tom (88% - Next review Mar 6)
- ...
```

### Step 3: Teacher Plans Revision Schedule
```
System Recommendation:
"8 students need revision review within 7 days.
Schedule a 20-minute revision class on Feb 27."

Teacher Actions:
[ ] Send revision assignment to 8 students
[ ] Schedule small group review session
[ ] Create review quiz (easier, concept-focused)
[ ] Mark as "Revisited" once students re-attempt
```

---

## 📈 SCENARIO 5: Concept Mastery Heatmap (Phase 3)

### Step 1: System Shows Which Concepts Are Hard
```
Topic: Linear Equations
Concepts: [Variables, Coefficients, Equality, Isolation, Verification]

Student-Concept Mastery:
├─ Variables: ███████░░ 70%
├─ Coefficients: █░░░░░░░░ 10% 🔴
├─ Equality: ████████░░ 80% ✅
├─ Isolation: ██████░░░░ 60%
└─ Verification: ███████░░ 70%

Class Entropy Analysis:
Generally balanced except "Coefficients" is polarized
→ Recommendation: Extra practice on coefficient manipulation
```

### Step 2: Generate Remedial Content
```
System suggests:
"12 students (67%) struggling with Coefficients concept
→ Auto-generate 5 practice problems focused on coefficients
→ Create micro-lesson: 'Understanding Coefficients'
→ Schedule small group (12 students) for targeted practice"
```

---

## 💡 KEY METRICS EXPLAINED

### 1. **Mastery Score (0-1)**
```
What: Overall understanding of topic
Formula: (Σ Score × Difficulty) / (Σ Difficulty)
Example: 0.70 = 70% mastery
When to worry: < 0.5 (less than 50%)
```

### 2. **Learning Velocity (positive/negative)**
```
What: Rate of improvement per day
Example: +0.05 = improving by 5% per day
         -0.03 = declining by 3% per day
Action: Negative velocity for 2+ attempts = intervention
```

### 3. **Engagement Index (0-1)**
```
What: How much student is interacting
Components:
  - 40% time spent
  - 30% quiz attempts
  - 30% content views
Example: 0.65 = good engagement
Alert: < 0.4 = low engagement
```

### 4. **Knowledge Decay**
```
What: Predicted retention over time
Formula: K(t) = K₀ × e^(-λ × Δt)
Example: 79% today → 51% in 7 days
Alert: < 60% = time to revise
```

### 5. **Entropy (Class Balance)**
```
What: How polarized vs balanced is class
High (0.8-1.0): Balanced, diverse skills ✅
Low (0-0.4): Polarized, extreme differences ⚠️
```

---

## 🔗 INTEGRATION CHECKLIST

### For Teacher Dashboard
```typescript
// Add to sidebar
<NavLink to="/teacher/ildce">
  <BookOpen /> Class Content
</NavLink>

// Pass auth data
<ILDCEDashboard 
  classId={currentClass.id}
  teacherId={user.id}
/>
```

### For Student Dashboard
```typescript
// Create Quizzes section
<QuizzesTab>
  <QuizList quizzes={studentQuizzes} />
  <PerformanceMetrics studentMetrics={metrics} />
  <ContentRecommendations />
</QuizzesTab>
```

### For Parent Dashboard
```typescript
// Show child progress
<StudentProgress>
  <MasteryScores topics={studentMetrics} />
  <ConceptHeatmap />
  <RevisionPredictions />
</StudentProgress>
```

---

**Summary**: ILDCE is a complete, production-ready learning analytics system.
Start with Phase 1 core functionality, test thoroughly, then add Phases 2 & 3.

