# 🚀 Research-Grade Features Integration Guide
## How to Use the Advanced Mathematical Models

> **For Developers**: Quick reference for integrating research-grade mathematical functions into APIs and UI components.

---

## 📦 Import Statement

```javascript
const {
  // Basic metrics (existing)
  calculateMastery,
  calculateDynamicDifficulty,
  calculateLearningVelocity,
  calculateEngagementIndex,
  calculateKnowledgeDecay,
  calculateClassEntropy,
  updateStudentMetrics,
  updateTopicMetrics,
  
  // Research-grade models (NEW)
  calculatePersonalizedForgettingRate,
  calculatePersonalizedKnowledgeDecay,
  calculateTopicVolatilityIndex,
  calculateCompositeIntelligenceScore,
  calculateIRTParameters,
  irtProbability,
  bayesianKnowledgeTracing,
  tTest,
  compareInterventionEffect,
  analyzeLongitudinalTrends,
  analyzeClassTrends,
} = require('@/lib/mathIntelligenceEngine');
```

---

## 🎯 Use Case Examples

### 1. Personalized Forgetting Rate

**Use Case**: Show each student their unique forgetting rate and review schedule.

**API Endpoint**: `GET /api/ildce/student/forgetting-rate`

```javascript
// pages/api/ildce/student/forgetting-rate.js
import { calculatePersonalizedForgettingRate, calculatePersonalizedKnowledgeDecay } from '@/lib/mathIntelligenceEngine';

export default async function handler(req, res) {
  const { studentId, topicId } = req.query;
  
  try {
    // Calculate personalized λ
    const lambdaData = await calculatePersonalizedForgettingRate(studentId, topicId);
    
    // Calculate current decay status
    const decayData = await calculatePersonalizedKnowledgeDecay(studentId, topicId);
    
    res.status(200).json({
      personalizedLambda: lambdaData.lambda,
      forgettingSpeed: lambdaData.classification,
      currentKnowledge: decayData.currentKnowledge,
      daysUntilDecay: decayData.daysUntilThreshold,
      recommendedReviewDate: decayData.predictedDecayDate,
      interpretation: decayData.interpretation,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

**UI Component**: `StudentForgettingProfile.tsx`

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Clock, AlertTriangle } from 'lucide-react';

interface ForgettingData {
  personalizedLambda: number;
  forgettingSpeed: 'slow' | 'moderate' | 'fast';
  currentKnowledge: number;
  daysUntilDecay: number;
  recommendedReviewDate: string;
  interpretation: string;
}

export default function StudentForgettingProfile({ studentId, topicId }) {
  const [data, setData] = useState<ForgettingData | null>(null);

  useEffect(() => {
    fetch(`/api/ildce/student/forgetting-rate?studentId=${studentId}&topicId=${topicId}`)
      .then(res => res.json())
      .then(setData);
  }, [studentId, topicId]);

  if (!data) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Personal Learning Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5" />
            <div>
              <p className="text-sm text-gray-500">Forgetting Speed</p>
              <p className="text-lg font-bold capitalize">{data.forgettingSpeed}</p>
              <p className="text-xs text-gray-400">λ = {data.personalizedLambda.toFixed(4)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5" />
            <div>
              <p className="text-sm text-gray-500">Current Knowledge Level</p>
              <p className="text-lg font-bold">{(data.currentKnowledge * 100).toFixed(1)}%</p>
            </div>
          </div>

          {data.daysUntilDecay < 7 && (
            <div className="flex items-center gap-3 bg-orange-50 p-3 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800">Review Recommended</p>
                <p className="text-xs text-orange-600">
                  {data.daysUntilDecay} days until knowledge decay
                </p>
              </div>
            </div>
          )}

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">{data.interpretation}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 2. Topic Volatility Index (TVI)

**Use Case**: Show teachers which topics have inconsistent understanding.

**API Endpoint**: `GET /api/ildce/analytics/topic-volatility`

```javascript
// pages/api/ildce/analytics/topic-volatility.js
import { calculateTopicVolatilityIndex } from '@/lib/mathIntelligenceEngine';

export default async function handler(req, res) {
  const { topicId, classId } = req.query;
  
  try {
    const tviData = await calculateTopicVolatilityIndex(topicId, classId);
    
    res.status(200).json(tviData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

**UI Component**: `TopicVolatilityChart.tsx`

```typescript
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function TopicVolatilityChart({ topics }) {
  const getColor = (stability: string) => {
    switch (stability) {
      case 'stable': return '#10b981'; // green
      case 'moderate': return '#f59e0b'; // amber
      case 'volatile': return '#ef4444'; // red
      case 'highly_volatile': return '#991b1b'; // dark red
      default: return '#6b7280'; // gray
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Topic Volatility Analysis</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={topics}>
          <XAxis dataKey="topicName" />
          <YAxis label={{ value: 'TVI', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload?.[0]) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 rounded shadow-lg border">
                    <p className="font-semibold">{data.topicName}</p>
                    <p className="text-sm">TVI: {data.tvi.toFixed(3)}</p>
                    <p className="text-sm">Mean Score: {(data.mean * 100).toFixed(1)}%</p>
                    <p className="text-sm">Std Dev: {(data.stdDev * 100).toFixed(1)}%</p>
                    <p className="text-sm text-gray-600">{data.interpretation}</p>
                    {data.recommendation && (
                      <p className="text-xs mt-2 text-blue-600">{data.recommendation}</p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="tvi" radius={[8, 8, 0, 0]}>
            {topics.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.stability)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 flex gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
          <span className="text-sm">Stable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
          <span className="text-sm">Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
          <span className="text-sm">Volatile</span>
        </div>
      </div>
    </Card>
  );
}
```

---

### 3. Composite Intelligence Score (CIS)

**Use Case**: Dashboard widget showing overall classroom health.

**API Endpoint**: `GET /api/ildce/analytics/composite-intelligence`

```javascript
// pages/api/ildce/analytics/composite-intelligence.js
import { calculateCompositeIntelligenceScore } from '@/lib/mathIntelligenceEngine';

export default async function handler(req, res) {
  const { topicId, classId } = req.query;
  
  try {
    const cisData = await calculateCompositeIntelligenceScore(topicId, classId);
    
    res.status(200).json(cisData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

**UI Component**: `ClassroomIntelligenceGauge.tsx`

```typescript
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

export default function ClassroomIntelligenceGauge({ topicId, classId }) {
  const [cisData, setCisData] = React.useState(null);

  React.useEffect(() => {
    fetch(`/api/ildce/analytics/composite-intelligence?topicId=${topicId}&classId=${classId}`)
      .then(res => res.json())
      .then(setCisData);
  }, [topicId, classId]);

  if (!cisData) return <div>Loading...</div>;

  const getColor = (grade: string) => {
    switch (grade) {
      case 'A': return '#10b981';
      case 'B': return '#3b82f6';
      case 'C': return '#f59e0b';
      case 'D': return '#ef4444';
      case 'F': return '#991b1b';
      default: return '#6b7280';
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Classroom Intelligence Score</h3>
      
      <div className="flex items-center gap-6">
        <div style={{ width: 150, height: 150 }}>
          <CircularProgressbar
            value={cisData.cis * 100}
            text={cisData.grade}
            styles={buildStyles({
              textSize: '32px',
              pathColor: getColor(cisData.grade),
              textColor: getColor(cisData.grade),
              trailColor: '#e5e7eb',
            })}
          />
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <p className="text-2xl font-bold" style={{ color: getColor(cisData.grade) }}>
              {(cisData.cis * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600">{cisData.interpretation}</p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Components:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Mastery:</span>
                <span className="ml-2 font-medium">{(cisData.components.avgMastery.value * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-gray-500">Stability:</span>
                <span className="ml-2 font-medium">{(cisData.components.stability.value * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-gray-500">Difficulty:</span>
                <span className="ml-2 font-medium">{(cisData.components.difficulty.value * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-gray-500">Entropy:</span>
                <span className="ml-2 font-medium">{(cisData.components.entropy.value * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {cisData.actionItems && cisData.actionItems.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Action Items:</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                {cisData.actionItems.map((item, idx) => (
                  <li key={idx}>• {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
```

---

### 4. Item Response Theory (IRT) - Adaptive Quiz

**Use Case**: Generate next quiz question based on student ability.

**API Endpoint**: `POST /api/ildce/quiz/adaptive-generate`

```javascript
// pages/api/ildce/quiz/adaptive-generate.js
import { calculateIRTParameters, irtProbability } from '@/lib/mathIntelligenceEngine';
import Quiz from '@/models/Quiz';

export default async function handler(req, res) {
  const { studentId, topicId, classId } = req.body;
  
  try {
    // Get IRT parameters for this topic/class
    const irtData = await calculateIRTParameters(topicId, classId);
    
    // Get student's ability
    const studentAbility = irtData.studentAbilities[studentId] || 0;
    
    // Find all available questions for this topic
    const allQuizzes = await Quiz.find({ topicId });
    const allQuestions = [];
    
    allQuizzes.forEach(quiz => {
      quiz.questions.forEach((q, idx) => {
        const questionDifficulty = irtData.questionDifficulties[`Q${idx}`] || 0;
        allQuestions.push({
          question: q,
          difficulty: questionDifficulty,
          probability: irtProbability(studentAbility, questionDifficulty),
        });
      });
    });
    
    // Select question closest to student ability (maximize information gain)
    // Target probability around 0.5-0.7 for optimal challenge
    const targetQuestion = allQuestions
      .sort((a, b) => {
        const aDist = Math.abs(a.probability - 0.6);
        const bDist = Math.abs(b.probability - 0.6);
        return aDist - bDist;
      })[0];
    
    res.status(200).json({
      question: targetQuestion.question,
      expectedProbability: targetQuestion.probability,
      studentAbility,
      questionDifficulty: targetQuestion.difficulty,
      recommendation: targetQuestion.probability > 0.8 
        ? 'Question may be too easy' 
        : targetQuestion.probability < 0.3 
          ? 'Question may be too hard' 
          : 'Optimal challenge level',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

### 5. Bayesian Knowledge Tracing

**Use Case**: Show probability student has mastered each concept.

**API Endpoint**: `GET /api/ildce/student/knowledge-state`

```javascript
// pages/api/ildce/student/knowledge-state.js
import { bayesianKnowledgeTracing } from '@/lib/mathIntelligenceEngine';

export default async function handler(req, res) {
  const { studentId, topicId } = req.query;
  
  try {
    const bktData = await bayesianKnowledgeTracing(studentId, topicId);
    
    res.status(200).json(bktData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

**UI Component**: `KnowledgeStateHeatmap.tsx`

```typescript
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

export default function KnowledgeStateHeatmap({ studentId, concepts }) {
  const [knowledgeStates, setKnowledgeStates] = React.useState({});

  React.useEffect(() => {
    Promise.all(
      concepts.map(concept =>
        fetch(`/api/ildce/student/knowledge-state?studentId=${studentId}&topicId=${concept.id}`)
          .then(res => res.json())
          .then(data => ({ [concept.id]: data }))
      )
    ).then(results => {
      const states = Object.assign({}, ...results);
      setKnowledgeStates(states);
    });
  }, [studentId, concepts]);

  const getColor = (probability: number) => {
    if (probability > 0.95) return 'bg-green-600';
    if (probability > 0.7) return 'bg-green-400';
    if (probability > 0.5) return 'bg-yellow-400';
    if (probability > 0.3) return 'bg-orange-400';
    return 'bg-red-400';
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Knowledge Mastery Map</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {concepts.map(concept => {
          const state = knowledgeStates[concept.id];
          if (!state) return null;
          
          return (
            <div
              key={concept.id}
              className={`p-4 rounded-lg ${getColor(state.knowledgeState)} text-white`}
            >
              <p className="text-sm font-medium">{concept.name}</p>
              <p className="text-2xl font-bold mt-2">{(state.knowledgeState * 100).toFixed(0)}%</p>
              {state.mastered && (
                <p className="text-xs mt-1">✓ Mastered</p>
              )}
              {state.attemptsToMastery && (
                <p className="text-xs">in {state.attemptsToMastery} attempts</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-600"></div>
          <span>Mastered (&gt;95%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-400"></div>
          <span>Learning (50-70%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-400"></div>
          <span>Struggling (&lt;30%)</span>
        </div>
      </div>
    </Card>
  );
}
```

---

### 6. Statistical Significance Testing

**Use Case**: Validate if teaching intervention improved performance.

**API Endpoint**: `POST /api/ildce/analytics/intervention-test`

```javascript
// pages/api/ildce/analytics/intervention-test.js
import { compareInterventionEffect } from '@/lib/mathIntelligenceEngine';

export default async function handler(req, res) {
  const { topicId, classId, interventionDate } = req.body;
  
  try {
    const testResult = await compareInterventionEffect(
      topicId,
      classId,
      new Date(interventionDate)
    );
    
    res.status(200).json(testResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

**UI Component**: `InterventionEffectAnalyzer.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function InterventionEffectAnalyzer({ topicId, classId }) {
  const [interventionDate, setInterventionDate] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    const response = await fetch('/api/ildce/analytics/intervention-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId, classId, interventionDate }),
    });
    const data = await response.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Intervention Effect Analysis</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Intervention Date</label>
          <Input
            type="date"
            value={interventionDate}
            onChange={(e) => setInterventionDate(e.target.value)}
            className="mt-1"
          />
        </div>

        <Button onClick={runAnalysis} disabled={loading || !interventionDate}>
          {loading ? 'Analyzing...' : 'Run Statistical Test'}
        </Button>

        {result && (
          <div className="mt-6 space-y-4">
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              result.significant && result.improvement > 0
                ? 'bg-green-50'
                : result.significant && result.improvement < 0
                  ? 'bg-red-50'
                  : 'bg-gray-50'
            }`}>
              {result.significant && result.improvement > 0 && <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />}
              {result.significant && result.improvement < 0 && <XCircle className="h-5 w-5 text-red-600 mt-0.5" />}
              {!result.significant && <AlertCircle className="h-5 w-5 text-gray-600 mt-0.5" />}
              
              <div className="flex-1">
                <p className="font-semibold">{result.interpretation}</p>
                <p className="text-sm text-gray-600 mt-1">{result.recommendation}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Before Intervention</p>
                <p className="text-2xl font-bold text-blue-900">{(result.beforeAvg * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">After Intervention</p>
                <p className="text-2xl font-bold text-green-900">{(result.afterAvg * 100).toFixed(1)}%</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Improvement</p>
                <p className="font-bold">{result.improvementPercentage.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-gray-500">P-value</p>
                <p className="font-bold">{result.pValue.toFixed(3)}</p>
              </div>
              <div>
                <p className="text-gray-500">Effect Size</p>
                <p className="font-bold">{result.effectSize.toFixed(3)}</p>
              </div>
            </div>

            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <p className="font-semibold mb-1">Statistical Details:</p>
              <p>• T-statistic: {result.tStatistic?.toFixed(3)}</p>
              <p>• Significance level (α): 0.05</p>
              <p>• {result.significant ? '✓' : '✗'} Statistically significant at 95% confidence</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
```

---

### 7. Longitudinal Trend Analysis

**Use Case**: Show student's performance trend over time with forecast.

**API Endpoint**: `GET /api/ildce/student/trend-analysis`

```javascript
// pages/api/ildce/student/trend-analysis.js
import { analyzeLongitudinalTrends } from '@/lib/mathIntelligenceEngine';

export default async function handler(req, res) {
  const { studentId, topicId, timeWindowDays = 90 } = req.query;
  
  try {
    const trendData = await analyzeLongitudinalTrends(
      studentId,
      topicId,
      parseInt(timeWindowDays)
    );
    
    res.status(200).json(trendData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

**UI Component**: `StudentTrendChart.tsx`

```typescript
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StudentTrendChart({ studentId, topicId }) {
  const [trendData, setTrendData] = React.useState(null);

  React.useEffect(() => {
    fetch(`/api/ildce/student/trend-analysis?studentId=${studentId}&topicId=${topicId}`)
      .then(res => res.json())
      .then(setTrendData);
  }, [studentId, topicId]);

  if (!trendData || trendData.trend === 'insufficient_data') {
    return <div>Insufficient data for trend analysis</div>;
  }

  const getTrendIcon = () => {
    if (trendData.trend.includes('improvement')) return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (trendData.trend.includes('decline')) return <TrendingDown className="h-5 w-5 text-red-600" />;
    return <Minus className="h-5 w-5 text-gray-600" />;
  };

  const getTrendColor = () => {
    if (trendData.trend.includes('improvement')) return '#10b981';
    if (trendData.trend.includes('decline')) return '#ef4444';
    return '#6b7280';
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Performance Trend Analysis</h3>
      
      <div className="flex items-center gap-3 mb-4">
        {getTrendIcon()}
        <div>
          <p className="font-semibold capitalize">{trendData.trend.replace(/_/g, ' ')}</p>
          <p className="text-sm text-gray-600">{trendData.interpretation}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={[
          /* You'll need to fetch actual time series data for the chart */
        ]}>
          <XAxis dataKey="date" />
          <YAxis domain={[0, 1]} />
          <Tooltip />
          <Line type="monotone" dataKey="score" stroke={getTrendColor()} strokeWidth={2} />
          <Line type="monotone" dataKey="movingAvg" stroke="#94a3b8" strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-gray-500">Daily Rate</p>
          <p className="font-bold">{(trendData.dailyRate * 100).toFixed(3)}%/day</p>
        </div>
        <div>
          <p className="text-gray-500">R² (Confidence)</p>
          <p className="font-bold">{(trendData.rSquared * 100).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-gray-500">Overall Change</p>
          <p className="font-bold">{(trendData.overallChange * 100).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-gray-500">30-Day Forecast</p>
          <p className="font-bold">{(trendData.forecast.predictedScore * 100).toFixed(1)}%</p>
        </div>
      </div>

      {trendData.changePoints && trendData.changePoints.length > 0 && (
        <div className="mt-4 bg-blue-50 p-3 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 mb-2">Change Points Detected:</p>
          {trendData.changePoints.map((cp, idx) => (
            <p key={idx} className="text-xs text-blue-800">
              • {new Date(cp.date).toLocaleDateString()}: {cp.direction} ({(cp.magnitude * 100).toFixed(1)}% change)
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}
```

---

## 📊 Database Schema Updates

To fully support these features, update your models:

### StudentMetrics Schema Addition

```javascript
// Add to StudentMetrics model
{
  // Existing fields...
  mastery_score: Number,
  learning_velocity: Number,
  engagement_index: Number,
  
  // NEW FIELDS FOR RESEARCH-GRADE FEATURES
  personalized_lambda: {
    type: Number,
    default: 0.05,
  },
  forgetting_speed: {
    type: String,
    enum: ['slow', 'moderate', 'fast'],
    default: 'moderate',
  },
  bayesian_knowledge_prob: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
  },
  irt_ability: {
    type: Number,
    default: 0,
  },
  last_lambda_calculation: {
    type: Date,
  },
}
```

### TopicMetrics Schema Addition

```javascript
// Add to TopicMetrics model
{
  // Existing fields...
  class_avg_mastery: Number,
  dynamic_difficulty: Number,
  entropy: Number,
  
  // NEW FIELDS
  volatility_index: {
    type: Number,
    default: 0,
  },
  volatility_stability: {
    type: String,
    enum: ['stable', 'moderate', 'volatile', 'highly_volatile', 'unknown'],
    default: 'unknown',
  },
  composite_intelligence_score: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
  },
  cis_grade: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'F', 'N/A'],
    default: 'N/A',
  },
  last_cis_calculation: {
    type: Date,
  },
}
```

### Quiz Schema Addition

```javascript
// Add to Quiz questions array
questions: [{
  // Existing fields...
  question: String,
  options: [String],
  correctAnswer: Number,
  
  // NEW IRT PARAMETERS
  irt_difficulty: {
    type: Number,
    default: 0,
  },
  irt_discrimination: {
    type: Number,
    default: 1.0,
  },
  success_rate: {
    type: Number,
    default: 0.5,
  },
  times_attempted: {
    type: Number,
    default: 0,
  },
}]
```

---

## 🔄 Automatic Updates

### Update Student Metrics After Quiz

```javascript
// In your quiz submission handler
import {
  updateStudentMetrics,
  calculatePersonalizedForgettingRate,
  bayesianKnowledgeTracing,
  calculateIRTParameters,
} from '@/lib/mathIntelligenceEngine';

async function onQuizSubmit(studentId, topicId, classId, score, answers) {
  // 1. Update basic metrics (existing)
  await updateStudentMetrics(studentId, topicId, classId);
  
  // 2. Update personalized λ (NEW - run every 5 attempts)
  const attemptCount = await StudentQuizAttempt.countDocuments({ studentId, topicId });
  if (attemptCount % 5 === 0) {
    const lambdaData = await calculatePersonalizedForgettingRate(studentId, topicId);
    await StudentMetrics.updateOne(
      { studentId, topicId },
      { 
        personalized_lambda: lambdaData.lambda,
        forgetting_speed: lambdaData.classification,
        last_lambda_calculation: new Date(),
      }
    );
  }
  
  // 3. Update Bayesian knowledge state (NEW)
  const bktData = await bayesianKnowledgeTracing(studentId, topicId);
  await StudentMetrics.updateOne(
    { studentId, topicId },
    { bayesian_knowledge_prob: bktData.knowledgeState }
  );
  
  // 4. Update IRT parameters at class level (NEW - run every 10 attempts)
  const classAttemptCount = await StudentQuizAttempt.countDocuments({ classId, topicId });
  if (classAttemptCount % 10 === 0) {
    const irtData = await calculateIRTParameters(topicId, classId);
    // Store student abilities
    for (const [sid, ability] of Object.entries(irtData.studentAbilities)) {
      await StudentMetrics.updateOne(
        { studentId: sid, topicId },
        { irt_ability: ability }
      );
    }
  }
}
```

### Update Topic Metrics Daily

```javascript
// Cron job or scheduled task
import {
  updateTopicMetrics,
  calculateTopicVolatilityIndex,
  calculateCompositeIntelligenceScore,
} from '@/lib/mathIntelligenceEngine';

async function dailyTopicMetricsUpdate() {
  const topics = await Topic.find({ active: true });
  
  for (const topic of topics) {
    const classes = await Class.find({ topics: topic._id });
    
    for (const cls of classes) {
      // 1. Update basic metrics (existing)
      await updateTopicMetrics(topic._id, cls._id, cls.teacherId);
      
      // 2. Calculate TVI (NEW)
      const tviData = await calculateTopicVolatilityIndex(topic._id, cls._id);
      
      // 3. Calculate CIS (NEW)
      const cisData = await calculateCompositeIntelligenceScore(topic._id, cls._id);
      
      // 4. Update database
      await TopicMetrics.updateOne(
        { topicId: topic._id, classId: cls._id },
        {
          volatility_index: tviData.tvi,
          volatility_stability: tviData.stability,
          composite_intelligence_score: cisData.cis,
          cis_grade: cisData.grade,
          last_cis_calculation: new Date(),
        }
      );
    }
  }
}
```

---

## 🚀 Quick Start Checklist

- [ ] Import all functions from `mathIntelligenceEngine.js`
- [ ] Create API endpoints for each research feature
- [ ] Update database schemas with new fields
- [ ] Create UI components to visualize metrics
- [ ] Add automatic updates to quiz submission handler
- [ ] Set up cron job for daily metric updates
- [ ] Add research metrics to teacher dashboard
- [ ] Add personalized insights to student/parent views
- [ ] Test with real data (minimum 5 students, 10 attempts each)
- [ ] Monitor performance (cache expensive calculations)

---

## 📚 Further Reading

- See `RESEARCH_GRADE_MATHEMATICS.md` for full mathematical formulations
- Check existing ILDCE documentation for basic features
- Review academic papers on IRT, BKT, and learning analytics

---

**Integration Status**: Ready for Implementation  
**Last Updated**: 2024  
**Complexity**: Advanced (Research-Grade)

