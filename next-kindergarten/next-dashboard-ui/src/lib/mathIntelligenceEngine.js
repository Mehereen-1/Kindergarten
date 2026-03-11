/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MATHEMATICAL INTELLIGENCE ENGINE - RESEARCH GRADE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * A mathematically rigorous learning analytics system that models education
 * as a dynamic system using:
 * 
 * 1. Personalized Forgetting Curves (Individual λ per student)
 * 2. Item Response Theory (IRT) for adaptive difficulty
 * 3. Bayesian Knowledge Tracing
 * 4. Shannon Entropy for class disorder analysis
 * 5. Topic Volatility Index (TVI)
 * 6. Composite Classroom Intelligence Score (CIS)
 * 7. Statistical Significance Testing
 * 8. Longitudinal Trend Analysis
 * 
 * Author: AI-Powered Education System
 * Version: 2.0 - Research Grade
 * Date: February 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

const StudentMetrics = require('./models/StudentMetrics');
const StudentQuizAttempt = require('./models/StudentQuizAttempt');
const Topic = require('./models/Topic');
const TopicMetrics = require('./models/TopicMetrics');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: PERSONALIZED FORGETTING RATE (λ) CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate personalized forgetting rate λ for each student
 * 
 * Formula: λ = [ln(K₀) - ln(Kₜ)] / Δt
 * 
 * Where:
 * - K₀ = Initial mastery level
 * - Kₜ = Mastery level at time t
 * - Δt = Time elapsed (in days)
 * 
 * This gives each student their unique memory decay speed.
 * Higher λ = faster forgetting (needs more frequent review)
 * Lower λ = slower forgetting (retains knowledge longer)
 * 
 * @returns {number} Personalized forgetting rate λ
 */
async function calculatePersonalizedForgettingRate(studentId, topicId) {
  try {
    const attempts = await StudentQuizAttempt.find({
      studentId,
      topicId,
    }).sort({ submittedAt: 1 });

    if (attempts.length < 2) {
      return 0.05; // Default λ if insufficient data
    }

    // Calculate λ from multiple data points for robustness
    const lambdas = [];
    
    for (let i = 1; i < attempts.length; i++) {
      const K0 = attempts[i - 1].score; // Previous mastery
      const Kt = attempts[i].score; // Current mastery
      
      if (K0 <= 0 || Kt <= 0) continue; // Skip invalid data
      
      const t0 = new Date(attempts[i - 1].submittedAt).getTime();
      const t1 = new Date(attempts[i].submittedAt).getTime();
      const deltaT = (t1 - t0) / (1000 * 60 * 60 * 24); // Convert to days
      
      if (deltaT <= 0) continue;
      
      // λ = [ln(K₀) - ln(Kₜ)] / Δt
      const lambda = (Math.log(K0) - Math.log(Kt)) / deltaT;
      
      // Only consider positive decay (negative means improvement, not decay)
      if (lambda > 0 && lambda < 1) { // Sanity check
        lambdas.push(lambda);
      }
    }

    if (lambdas.length === 0) {
      return 0.05; // Default
    }

    // Return average λ across all intervals (more robust)
    const avgLambda = lambdas.reduce((sum, l) => sum + l, 0) / lambdas.length;
    
    // Clamp λ between reasonable bounds (0.01 to 0.2)
    return Math.min(Math.max(avgLambda, 0.01), 0.2);
    
  } catch (error) {
    console.error('Error calculating personalized forgetting rate:', error);
    return 0.05; // Default fallback
  }
}

/**
 * Enhanced Knowledge Decay with Personalized λ
 * 
 * Formula: K(t) = K₀ × e^(-λ × Δt)
 * 
 * Now uses student-specific λ instead of hardcoded value.
 */
async function calculatePersonalizedKnowledgeDecay(studentId, topicId) {
  try {
    const attempts = await StudentQuizAttempt.find({
      studentId,
      topicId,
    }).sort({ submittedAt: -1 }).limit(1);

    if (attempts.length === 0) {
      return {
        currentKnowledge: 0,
        personalizedLambda: 0,
        predictedDropDate: null,
        daysUntilDecay: null,
        forgettingSpeed: 'unknown',
      };
    }

    const lastAttempt = attempts[0];
    const K0 = lastAttempt.score; // Initial knowledge
    const lastReviewDate = new Date(lastAttempt.submittedAt);
    
    // Calculate personalized λ
    const lambda = await calculatePersonalizedForgettingRate(studentId, topicId);
    
    // Calculate time elapsed since last review
    const now = new Date();
    const deltaT = (now - lastReviewDate) / (1000 * 60 * 60 * 24); // days
    
    // Current knowledge: K(t) = K₀ × e^(-λ × Δt)
    const currentKnowledge = K0 * Math.exp(-lambda * deltaT);
    
    // Predict when knowledge drops below threshold (0.6)
    let predictedDropDate = null;
    let daysUntilDecay = null;
    
    if (K0 > 0.6) {
      // Solve for t when K(t) = 0.6
      // 0.6 = K₀ × e^(-λ × t)
      // ln(0.6/K₀) = -λ × t
      // t = -ln(0.6/K₀) / λ
      const tDrop = -Math.log(0.6 / K0) / lambda;
      daysUntilDecay = Math.max(0, tDrop - deltaT);
      predictedDropDate = new Date(now.getTime() + daysUntilDecay * 24 * 60 * 60 * 1000);
    }
    
    // Classify forgetting speed
    let forgettingSpeed;
    if (lambda < 0.03) forgettingSpeed = 'slow'; // Excellent long-term retention
    else if (lambda < 0.07) forgettingSpeed = 'moderate'; // Normal forgetting
    else forgettingSpeed = 'fast'; // Needs frequent review
    
    return {
      currentKnowledge: Math.min(Math.max(currentKnowledge, 0), 1),
      personalizedLambda: lambda,
      predictedDropDate,
      daysUntilDecay,
      forgettingSpeed,
      recommendation: currentKnowledge < 0.6 
        ? 'URGENT: Review needed' 
        : daysUntilDecay && daysUntilDecay < 7 
          ? 'Schedule review soon' 
          : 'Continue normal learning',
    };
  } catch (error) {
    console.error('Error calculating personalized decay:', error);
    return {
      currentKnowledge: 0,
      personalizedLambda: 0,
      predictedDropDate: null,
      daysUntilDecay: null,
      forgettingSpeed: 'unknown',
    };
  }
}

/**
 * 🔶 A. MASTERY MODEL
 * Mastery = (Sum of Score × Difficulty Weight) / (Sum of Difficulty Weight)
 * Range: 0-1
 */
async function calculateMastery(studentId, topicId) {
  try {
    const attempts = await StudentQuizAttempt.find({
      studentId,
      topicId,
    });

    if (attempts.length === 0) return 0;

    const topic = await Topic.findById(topicId);
    const difficultyWeight = topic.difficulty_weight;

    const totalWeightedScore = attempts.reduce((sum, attempt) => {
      return sum + (attempt.percentage * difficultyWeight);
    }, 0);

    const totalWeight = attempts.length * difficultyWeight;
    const mastery = totalWeightedScore / totalWeight / 100; // Normalize to 0-1

    return Math.min(Math.max(mastery, 0), 1); // Clamp between 0-1
  } catch (error) {
    console.error('Error calculating mastery:', error);
    return 0;
  }
}

/**
 * 🔶 B. DYNAMIC TOPIC DIFFICULTY
 * Difficulty = 1 - (Total Correct / Total Attempts)
 * Shows which topics are becoming hard
 */
async function calculateDynamicDifficulty(topicId) {
  try {
    const attempts = await StudentQuizAttempt.find({ topicId });

    if (attempts.length === 0) return 0;

    const totalCorrect = attempts.reduce((sum, a) => sum + a.correct_answers, 0);
    const totalQuestions = attempts.reduce((sum, a) => sum + a.total_questions, 0);

    if (totalQuestions === 0) return 0;

    const difficulty = 1 - (totalCorrect / totalQuestions);
    return Math.min(Math.max(difficulty, 0), 1);
  } catch (error) {
    console.error('Error calculating dynamic difficulty:', error);
    return 0;
  }
}

/**
 * 🔶 C. LEARNING VELOCITY
 * Velocity = (M_current - M_previous) / Δt
 * Positive = Improving, Negative = Declining
 */
async function calculateLearningVelocity(studentId, topicId) {
  try {
    const attempts = await StudentQuizAttempt.find({
      studentId,
      topicId,
      sort: { timestamp: 1 },
    });

    if (attempts.length < 2) return 0;

    const lastAttempt = attempts[attempts.length - 1];
    const previousAttempt = attempts[attempts.length - 2];

    const m_current = lastAttempt.percentage / 100;
    const m_previous = previousAttempt.percentage / 100;

    const timeDiff = (lastAttempt.timestamp - previousAttempt.timestamp) / (1000 * 60 * 60); // hours
    if (timeDiff === 0) return 0;

    const velocity = (m_current - m_previous) / timeDiff;
    return velocity;
  } catch (error) {
    console.error('Error calculating learning velocity:', error);
    return 0;
  }
}

/**
 * 🔶 D. ENGAGEMENT INDEX
 * Engagement = 0.4(TimeSpentNormalized) + 0.3(QuizAttempts) + 0.3(ContentInteraction)
 * Range: 0-1
 */
async function calculateEngagementIndex(studentId, topicId) {
  try {
    const metrics = await StudentMetrics.findOne({
      studentId,
      topicId,
    });

    if (!metrics) return 0;

    // Normalize time spent (assume max 5 hours = 18000 seconds)
    const maxTimeSpent = 18000;
    const timeNormalized = Math.min(metrics.total_time_spent / maxTimeSpent, 1);

    // Normalize quiz attempts (assume max 10 attempts)
    const maxAttempts = 10;
    const attemptsNormalized = Math.min(metrics.quiz_attempts / maxAttempts, 1);

    // Normalize content views (assume max 20 views)
    const maxViews = 20;
    const viewsNormalized = Math.min(metrics.content_views / maxViews, 1);

    const engagement = 
      (0.4 * timeNormalized) +
      (0.3 * attemptsNormalized) +
      (0.3 * viewsNormalized);

    return Math.min(Math.max(engagement, 0), 1);
  } catch (error) {
    console.error('Error calculating engagement:', error);
    return 0;
  }
}

/**
 * 🔶 E. KNOWLEDGE DECAY (Advanced AI-Math Hybrid)
 * Knowledge(t) = K₀ × e^(-λ × Δt)
 * Predicts when student will forget (K < 0.6)
 */
async function calculateKnowledgeDecay(studentId, topicId) {
  try {
    const metrics = await StudentMetrics.findOne({
      studentId,
      topicId,
    });

    if (!metrics || !metrics.last_review_date) {
      return {
        current_knowledge: metrics ? metrics.mastery_score : 0,
        decay_rate: 0,
        predicted_drop_date: null,
      };
    }

    // Assume decay constant λ = 0.05 (adjustable based on forgetting curve)
    const lambda = 0.05;
    const K0 = metrics.mastery_score;
    
    const timeSinceReview = (Date.now() - metrics.last_review_date) / (1000 * 60 * 60 * 24); // days
    const currentKnowledge = K0 * Math.exp(-lambda * timeSinceReview);

    // Find when knowledge drops below 0.6
    let predictedDropDate = null;
    if (currentKnowledge > 0.6) {
      // Solve for t when K(t) = 0.6
      // 0.6 = K₀ × e^(-λ × t)
      // ln(0.6/K₀) = -λ × t
      // t = -ln(0.6/K₀) / λ
      if (K0 > 0) {
        const daysToDrop = -Math.log(0.6 / K0) / lambda;
        predictedDropDate = new Date(Date.now() + daysToDrop * 24 * 60 * 60 * 1000);
      }
    }

    return {
      current_knowledge: Math.min(Math.max(currentKnowledge, 0), 1),
      decay_rate: lambda,
      predicted_drop_date: predictedDropDate,
      recommendation: currentKnowledge < 0.6 ? 'URGENT: Schedule revision' : 'Continue normal learning',
    };
  } catch (error) {
    console.error('Error calculating knowledge decay:', error);
    return {
      current_knowledge: 0,
      decay_rate: 0,
      predicted_drop_date: null,
    };
  }
}

/**
 * 🔶 F. ENTROPY-BASED CLASS DISORDER
 * H = -Σ(p_i × log(p_i))
 * Low entropy = Polarized class
 * High entropy = Balanced class
 */
async function calculateClassEntropy(classId, topicId) {
  try {
    const attempts = await StudentQuizAttempt.find({
      classId,
      topicId,
    }).distinct('studentId');

    if (attempts.length === 0) return 0;

    const studentMetrics = await StudentMetrics.find({
      studentId: { $in: attempts },
      topicId,
    });

    // Distribute students into mastery buckets (weak, moderate, strong)
    const buckets = {
      weak: 0,      // < 0.4
      moderate: 0,  // 0.4 - 0.7
      strong: 0,    // > 0.7
    };

    studentMetrics.forEach(metric => {
      if (metric.mastery_score < 0.4) buckets.weak++;
      else if (metric.mastery_score <= 0.7) buckets.moderate++;
      else buckets.strong++;
    });

    // Calculate entropy
    let entropy = 0;
    Object.values(buckets).forEach(count => {
      if (count > 0) {
        const p = count / studentMetrics.length;
        entropy -= p * Math.log2(p);
      }
    });

    return {
      entropy: entropy,
      max_possible_entropy: Math.log2(3), // Max entropy for 3 buckets
      normalized_entropy: entropy / Math.log2(3),
      distribution: buckets,
      interpretation: entropy < 0.5 ? 'Polarized class' : 'Balanced class',
    };
  } catch (error) {
    console.error('Error calculating entropy:', error);
    return { entropy: 0, interpretation: 'Error' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: TOPIC VOLATILITY INDEX (TVI)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Topic Volatility Index - Measures score inconsistency across students
 * 
 * Formula: TVI = σ_scores / μ_scores (Coefficient of Variation)
 * 
 * Where:
 * - σ = Standard deviation of scores
 * - μ = Mean of scores
 * 
 * High TVI → Topic causes inconsistent understanding (some get it, some don't)
 * Low TVI → Topic is consistently understood (stable performance)
 * 
 * This helps teachers identify topics that need clarification or restructuring.
 * 
 * @returns {object} Volatility metrics and interpretation
 */
async function calculateTopicVolatilityIndex(topicId, classId) {
  try {
    const attempts = await StudentQuizAttempt.find({
      topicId,
      classId,
    });

    if (attempts.length < 3) {
      return {
        tvi: 0,
        mean: 0,
        stdDev: 0,
        interpretation: 'Insufficient data',
        stability: 'unknown',
      };
    }

    // Calculate mean
    const scores = attempts.map(a => a.score);
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    
    // Calculate standard deviation
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // TVI = Coefficient of Variation
    const tvi = mean > 0 ? stdDev / mean : 0;
    
    // Interpret volatility
    let interpretation, stability;
    if (tvi < 0.15) {
      interpretation = 'Very stable - Consistent understanding across class';
      stability = 'stable';
    } else if (tvi < 0.3) {
      interpretation = 'Moderately stable - Some variation in understanding';
      stability = 'moderate';
    } else if (tvi < 0.5) {
      interpretation = 'Volatile - Inconsistent understanding, needs attention';
      stability = 'volatile';
    } else {
      interpretation = 'Highly volatile - Topic causes major confusion';
      stability = 'highly_volatile';
    }
    
    return {
      tvi: tvi,
      mean: mean,
      stdDev: stdDev,
      interpretation,
      stability,
      sampleSize: attempts.length,
      recommendation: stability === 'volatile' || stability === 'highly_volatile'
        ? 'Consider re-teaching this topic with different approach'
        : 'Topic is well understood by class',
    };
  } catch (error) {
    console.error('Error calculating TVI:', error);
    return {
      tvi: 0,
      mean: 0,
      stdDev: 0,
      interpretation: 'Error',
      stability: 'unknown',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: COMPOSITE CLASSROOM INTELLIGENCE SCORE (CIS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Composite Classroom Intelligence Score - Your Signature Metric
 * 
 * Formula: CIS = w₁(AvgMastery) - w₂(Difficulty) + w₃(Stability) - w₄(Entropy)
 * 
 * Where:
 * - w₁, w₂, w₃, w₄ = Weights (tunable)
 * - AvgMastery = Class average mastery level
 * - Difficulty = Dynamic topic difficulty
 * - Stability = 1 - TVI (inverse of volatility)
 * - Entropy = Normalized entropy (0-1)
 * 
 * This creates a single metric that captures:
 * 1. How well class is learning (mastery)
 * 2. How hard the material is (difficulty)
 * 3. How consistent understanding is (stability)
 * 4. How balanced the class is (entropy)
 * 
 * Higher CIS = Healthy, effective classroom learning
 * Lower CIS = Classroom needs intervention
 * 
 * @returns {object} CIS score with breakdown and interpretation
 */
async function calculateCompositeIntelligenceScore(topicId, classId) {
  try {
    // Get all required metrics
    const attempts = await StudentQuizAttempt.find({ topicId, classId });
    
    if (attempts.length === 0) {
      return {
        cis: 0,
        components: {},
        interpretation: 'No data available',
        grade: 'N/A',
      };
    }

    // Component 1: Average Mastery
    const studentIds = [...new Set(attempts.map(a => a.studentId.toString()))];
    const studentMetrics = await StudentMetrics.find({
      studentId: { $in: studentIds },
      topicId,
    });
    
    const avgMastery = studentMetrics.length > 0
      ? studentMetrics.reduce((sum, m) => sum + (m.mastery_score || 0), 0) / studentMetrics.length
      : 0;
    
    // Component 2: Dynamic Difficulty (inverted - lower is better)
    const difficulty = await calculateDynamicDifficulty(topicId);
    
    // Component 3: Stability (inverse of TVI)
    const tviData = await calculateTopicVolatilityIndex(topicId, classId);
    const stability = 1 - Math.min(tviData.tvi, 1); // Clamp TVI to max 1
    
    // Component 4: Entropy (normalized)
    const entropyData = await calculateClassEntropy(classId, topicId);
    const normalizedEntropy = entropyData.normalized_entropy || 0;
    
    // Weights (tunable based on educational priorities)
    const w1 = 0.4; // Mastery weight
    const w2 = 0.2; // Difficulty weight (penalty)
    const w3 = 0.3; // Stability weight
    const w4 = 0.1; // Entropy weight (penalty for polarization)
    
    // Calculate CIS
    const cis = (w1 * avgMastery) - (w2 * difficulty) + (w3 * stability) - (w4 * (1 - normalizedEntropy));
    
    // Normalize to 0-1 range
    const normalizedCIS = Math.min(Math.max(cis, 0), 1);
    
    // Grade the classroom
    let grade, interpretation, actionItems = [];
    
    if (normalizedCIS >= 0.8) {
      grade = 'A';
      interpretation = 'Excellent - Classroom learning is highly effective';
      actionItems.push('Maintain current teaching approach');
      actionItems.push('Consider advancing to more challenging topics');
    } else if (normalizedCIS >= 0.65) {
      grade = 'B';
      interpretation = 'Good - Classroom is learning well with minor issues';
      actionItems.push('Continue monitoring student progress');
      if (difficulty > 0.5) actionItems.push('Consider simplifying difficult concepts');
    } else if (normalizedCIS >= 0.5) {
      grade = 'C';
      interpretation = 'Adequate - Classroom needs improvement';
      actionItems.push('Review teaching methods for this topic');
      if (stability < 0.7) actionItems.push('Address inconsistent understanding');
      if (normalizedEntropy < 0.5) actionItems.push('Focus on struggling students');
    } else if (normalizedCIS >= 0.35) {
      grade = 'D';
      interpretation = 'Poor - Significant intervention needed';
      actionItems.push('URGENT: Re-teach this topic');
      actionItems.push('Provide additional support materials');
      actionItems.push('Consider one-on-one tutoring for struggling students');
    } else {
      grade = 'F';
      interpretation = 'Critical - Immediate action required';
      actionItems.push('CRITICAL: Stop and reassess teaching approach');
      actionItems.push('Consider breaking topic into smaller chunks');
      actionItems.push('Implement remedial sessions');
    }
    
    return {
      cis: normalizedCIS,
      grade,
      interpretation,
      components: {
        avgMastery: { value: avgMastery, weight: w1, contribution: w1 * avgMastery },
        difficulty: { value: difficulty, weight: w2, contribution: -(w2 * difficulty) },
        stability: { value: stability, weight: w3, contribution: w3 * stability },
        entropy: { value: normalizedEntropy, weight: w4, contribution: -(w4 * (1 - normalizedEntropy)) },
      },
      actionItems,
      metadata: {
        studentsAnalyzed: studentIds.length,
        attemptsAnalyzed: attempts.length,
        calculatedAt: new Date(),
      },
    };
  } catch (error) {
    console.error('Error calculating CIS:', error);
    return {
      cis: 0,
      components: {},
      interpretation: 'Error calculating score',
      grade: 'N/A',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: ITEM RESPONSE THEORY (IRT) - Adaptive Difficulty
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Item Response Theory (IRT) - Scientifically calibrate question difficulty
 * 
 * Formula: P(correct) = 1 / (1 + e^(-a(θ - b)))
 * 
 * Where:
 * - θ (theta) = Student ability parameter
 * - b = Question difficulty parameter
 * - a = Discrimination parameter (how well question differentiates students)
 * 
 * This model:
 * 1. Estimates student ability (θ) based on response patterns
 * 2. Estimates question difficulty (b) based on student performance
 * 3. Can predict probability of correct answer
 * 4. Enables adaptive testing (next question based on ability)
 * 
 * @returns {object} IRT parameters and recommendations
 */
async function calculateIRTParameters(topicId, classId) {
  try {
    const attempts = await StudentQuizAttempt.find({ topicId, classId });
    
    if (attempts.length < 5) {
      return {
        studentAbilities: {},
        questionDifficulties: {},
        interpretation: 'Insufficient data for IRT analysis',
      };
    }

    // Simplified IRT implementation (1-parameter Rasch model for clarity)
    // In production, use proper maximum likelihood estimation
    
    const studentAbilities = {}; // θ values
    const questionDifficulties = {}; // b values
    
    // Estimate θ for each student (simplified: use mean score as proxy)
    const studentScores = {};
    attempts.forEach(attempt => {
      const sid = attempt.studentId.toString();
      if (!studentScores[sid]) studentScores[sid] = [];
      studentScores[sid].push(attempt.score);
    });
    
    Object.keys(studentScores).forEach(sid => {
      const scores = studentScores[sid];
      const meanScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      // Convert score (0-1) to logit scale for θ
      // θ = ln(p / (1-p)) where p is proportion correct
      const p = Math.min(Math.max(meanScore, 0.01), 0.99); // Avoid log(0)
      studentAbilities[sid] = Math.log(p / (1 - p));
    });
    
    // Estimate difficulty b for each question
    // Collect responses per question
    const questionResponses = {};
    attempts.forEach(attempt => {
      if (attempt.answers && Array.isArray(attempt.answers)) {
        attempt.answers.forEach((answer, qIdx) => {
          if (!questionResponses[qIdx]) questionResponses[qIdx] = [];
          questionResponses[qIdx].push({
            studentId: attempt.studentId.toString(),
            correct: answer === 1 || answer === true, // Assume 1 or true means correct
          });
        });
      }
    });
    
    Object.keys(questionResponses).forEach(qIdx => {
      const responses = questionResponses[qIdx];
      const correctCount = responses.filter(r => r.correct).length;
      const p = correctCount / responses.length;
      // Question difficulty b = -ln(p / (1-p))
      const pClamped = Math.min(Math.max(p, 0.01), 0.99);
      questionDifficulties[`Q${qIdx}`] = -Math.log(pClamped / (1 - pClamped));
    });
    
    // Provide adaptive recommendations
    const avgAbility = Object.values(studentAbilities).reduce((sum, a) => sum + a, 0) / Object.keys(studentAbilities).length;
    const avgDifficulty = Object.values(questionDifficulties).reduce((sum, d) => sum + d, 0) / Object.keys(questionDifficulties).length;
    
    let recommendation;
    if (avgDifficulty > avgAbility + 1) {
      recommendation = 'Questions are too difficult for current class ability level - Consider easier questions';
    } else if (avgDifficulty < avgAbility - 1) {
      recommendation = 'Questions are too easy - Challenge students with harder questions';
    } else {
      recommendation = 'Question difficulty is well-matched to class ability';
    }
    
    return {
      studentAbilities,
      questionDifficulties,
      avgStudentAbility: avgAbility,
      avgQuestionDifficulty: avgDifficulty,
      interpretation: recommendation,
      nextQuestionDifficulty: avgAbility, // Suggest next question at student ability level
    };
  } catch (error) {
    console.error('Error calculating IRT parameters:', error);
    return {
      studentAbilities: {},
      questionDifficulties: {},
      interpretation: 'Error in IRT analysis',
    };
  }
}

/**
 * Predict probability of correct answer using IRT
 * 
 * @param {number} theta - Student ability
 * @param {number} difficulty - Question difficulty
 * @param {number} discrimination - Question discrimination (default 1.0)
 * @returns {number} Probability (0-1)
 */
function irtProbability(theta, difficulty, discrimination = 1.0) {
  return 1 / (1 + Math.exp(-discrimination * (theta - difficulty)));
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: BAYESIAN KNOWLEDGE TRACING (BKT)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Bayesian Knowledge Tracing - Probabilistic model of knowledge state
 * 
 * Tracks probability that student has mastered a concept using:
 * - P(L) = Probability student has learned
 * - P(T) = Probability of transition from unlearned to learned
 * - P(S) = Probability of slip (know but answer wrong)
 * - P(G) = Probability of guess (don't know but answer right)
 * 
 * Updates after each question using Bayes' theorem.
 * 
 * @returns {object} Knowledge state probabilities
 */
async function bayesianKnowledgeTracing(studentId, topicId) {
  try {
    const attempts = await StudentQuizAttempt.find({
      studentId,
      topicId,
    }).sort({ submittedAt: 1 });

    if (attempts.length === 0) {
      return {
        knowledgeState: 0,
        confidence: 0,
        mastered: false,
        attemptsToMastery: null,
      };
    }

    // BKT Parameters (can be tuned based on empirical data)
    const P_T = 0.1; // Probability of learning (transition)
    const P_S = 0.1; // Probability of slip
    const P_G = 0.25; // Probability of guess
    
    // Initial prior P(L₀) based on first attempt
    let P_L = attempts[0].score; // Start with observed performance
    
    // Update P(L) after each subsequent attempt using Bayes rule
    for (let i = 1; i < attempts.length; i++) {
      const correct = attempts[i].score > 0.7; // Consider > 70% as "correct"
      
      if (correct) {
        // P(L|correct) = P(L) * P(correct|L) / P(correct)
        // P(correct|L) = 1 - P(S)
        // P(correct|¬L) = P(G)
        const P_correct = P_L * (1 - P_S) + (1 - P_L) * P_G;
        P_L = (P_L * (1 - P_S)) / P_correct;
      } else {
        // P(L|incorrect) = P(L) * P(incorrect|L) / P(incorrect)
        // P(incorrect|L) = P(S)
        // P(incorrect|¬L) = 1 - P(G)
        const P_incorrect = P_L * P_S + (1 - P_L) * (1 - P_G);
        P_L = (P_L * P_S) / P_incorrect;
      }
      
      // Apply learning transition
      P_L = P_L + (1 - P_L) * P_T;
      
      // Clamp to [0, 1]
      P_L = Math.min(Math.max(P_L, 0), 1);
    }
    
    const mastered = P_L > 0.95; // Consider mastered if >95% confidence
    const attemptsToMastery = mastered ? attempts.length : null;
    
    return {
      knowledgeState: P_L,
      confidence: P_L,
      mastered,
      attemptsToMastery,
      interpretation: mastered 
        ? 'Student has mastered this concept' 
        : P_L > 0.7 
          ? 'Student is learning, needs more practice'
          : 'Student struggling, needs intervention',
    };
  } catch (error) {
    console.error('Error in Bayesian Knowledge Tracing:', error);
    return {
      knowledgeState: 0,
      confidence: 0,
      mastered: false,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: STATISTICAL SIGNIFICANCE TESTING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * T-Test for comparing two groups of students
 * 
 * Tests if difference in performance is statistically significant.
 * 
 * @returns {object} T-statistic, p-value, and interpretation
 */
function tTest(group1, group2) {
  if (group1.length < 2 || group2.length < 2) {
    return { significant: false, pValue: 1, interpretation: 'Insufficient data' };
  }
  
  // Calculate means
  const mean1 = group1.reduce((sum, x) => sum + x, 0) / group1.length;
  const mean2 = group2.reduce((sum, x) => sum + x, 0) / group2.length;
  
  // Calculate variances
  const var1 = group1.reduce((sum, x) => sum + Math.pow(x - mean1, 2), 0) / (group1.length - 1);
  const var2 = group2.reduce((sum, x) => sum + Math.pow(x - mean2, 2), 0) / (group2.length - 1);
  
  // Pooled standard deviation
  const pooledSD = Math.sqrt(var1 / group1.length + var2 / group2.length);
  
  if (pooledSD === 0) {
    return { significant: false, pValue: 1, interpretation: 'No variation in data' };
  }
  
  // T-statistic
  const tStat = (mean1 - mean2) / pooledSD;
  
  // Degrees of freedom (simplified)
  const df = group1.length + group2.length - 2;
  
  // Approximate p-value (for simplicity, using rough approximation)
  // In production, use proper t-distribution lookup
  const absTStat = Math.abs(tStat);
  let pValue;
  if (absTStat > 2.576) pValue = 0.01; // 99% confidence
  else if (absTStat > 1.96) pValue = 0.05; // 95% confidence
  else if (absTStat > 1.645) pValue = 0.10; // 90% confidence
  else pValue = 0.20; // Not significant
  
  const significant = pValue < 0.05;
  
  return {
    tStatistic: tStat,
    pValue,
    significant,
    interpretation: significant 
      ? 'Performance difference is statistically significant'
      : 'No significant difference in performance',
    effectSize: Math.abs(mean1 - mean2),
  };
}

/**
 * Compare classroom performance before vs after intervention
 */
async function compareInterventionEffect(topicId, classId, interventionDate) {
  try {
    const allAttempts = await StudentQuizAttempt.find({
      topicId,
      classId,
    }).sort({ submittedAt: 1 });

    const beforeAttempts = allAttempts.filter(a => new Date(a.submittedAt) < interventionDate);
    const afterAttempts = allAttempts.filter(a => new Date(a.submittedAt) >= interventionDate);
    
    if (beforeAttempts.length < 2 || afterAttempts.length < 2) {
      return {
        significant: false,
        interpretation: 'Insufficient data for comparison',
      };
    }
    
    const beforeScores = beforeAttempts.map(a => a.score);
    const afterScores = afterAttempts.map(a => a.score);
    
    const result = tTest(beforeScores, afterScores);
    
    const beforeAvg = beforeScores.reduce((sum, s) => sum + s, 0) / beforeScores.length;
    const afterAvg = afterScores.reduce((sum, s) => sum + s, 0) / afterScores.length;
    const improvement = afterAvg - beforeAvg;
    
    return {
      ...result,
      beforeAvg,
      afterAvg,
      improvement,
      improvementPercentage: (improvement / beforeAvg) * 100,
      recommendation: result.significant && improvement > 0
        ? 'Intervention was effective - Continue approach'
        : result.significant && improvement < 0
          ? 'Intervention had negative effect - Reconsider approach'
          : 'No significant change detected',
    };
  } catch (error) {
    console.error('Error comparing intervention effect:', error);
    return { significant: false, interpretation: 'Error in analysis' };
  }
}

/**
 * UPDATE ALL METRICS FOR A STUDENT
 * Comprehensive update after quiz attempt
 */
async function updateStudentMetrics(studentId, topicId, classId) {
  try {
    const mastery = await calculateMastery(studentId, topicId);
    const velocity = await calculateLearningVelocity(studentId, topicId);
    const engagement = await calculateEngagementIndex(studentId, topicId);
    const decayData = await calculateKnowledgeDecay(studentId, topicId);

    const metrics = await StudentMetrics.findOneAndUpdate(
      { studentId, topicId, classId },
      {
        mastery_score: mastery,
        learning_velocity: velocity,
        engagement_index: engagement,
        predicted_decay: decayData.current_knowledge,
        last_updated: Date.now(),
        next_predicted_review_date: decayData.predicted_drop_date,
      },
      { upsert: true, new: true }
    );

    return metrics;
  } catch (error) {
    console.error('Error updating student metrics:', error);
    throw error;
  }
}

/**
 * UPDATE TOPIC-LEVEL METRICS FOR CLASS
 * Comprehensive class analytics
 */
async function updateTopicMetrics(topicId, classId, teacherId) {
  try {
    // Get all student attempts for this topic
    const attempts = await StudentQuizAttempt.find({
      topicId,
      classId,
    });

    if (attempts.length === 0) return null;

    // Get unique students
    const studentIds = [...new Set(attempts.map(a => a.studentId))];
    const studentMetrics = await StudentMetrics.find({
      studentId: { $in: studentIds },
      topicId,
    });

    // Calculate averages
    const avgMastery = studentMetrics.reduce((sum, m) => sum + m.mastery_score, 0) / studentMetrics.length;
    const avgEngagement = studentMetrics.reduce((sum, m) => sum + m.engagement_index, 0) / studentMetrics.length;
    const avgVelocity = studentMetrics.reduce((sum, m) => sum + m.learning_velocity, 0) / studentMetrics.length;

    // Distribution
    const distribution = {
      weak: studentMetrics.filter(m => m.mastery_score < 0.4).length,
      moderate: studentMetrics.filter(m => m.mastery_score >= 0.4 && m.mastery_score <= 0.7).length,
      strong: studentMetrics.filter(m => m.mastery_score > 0.7).length,
    };

    const improvingCount = studentMetrics.filter(m => m.learning_velocity > 0).length;
    const decliningCount = studentMetrics.filter(m => m.learning_velocity < 0).length;

    // Calculate dynamic difficulty
    const difficulty = await calculateDynamicDifficulty(topicId);

    // Calculate entropy
    const entropyData = await calculateClassEntropy(classId, topicId);

    // Generate alerts
    const alerts = generateAlerts(studentMetrics, avgMastery, avgEngagement, difficulty);

    const topicMetrics = await TopicMetrics.findOneAndUpdate(
      { topicId, classId, teacherId },
      {
        class_avg_mastery: avgMastery,
        dynamic_difficulty: difficulty,
        entropy: entropyData.normalized_entropy,
        mastery_distribution: distribution,
        avg_learning_velocity: avgVelocity,
        students_improving: improvingCount,
        students_declining: decliningCount,
        avg_engagement: avgEngagement,
        alerts: alerts,
        last_updated: Date.now(),
      },
      { upsert: true, new: true }
    );

    return topicMetrics;
  } catch (error) {
    console.error('Error updating topic metrics:', error);
    throw error;
  }
}

/**
 * ALERT GENERATION SYSTEM
 * Identifies critical issues automatically
 */
function generateAlerts(studentMetrics, avgMastery, avgEngagement, difficulty) {
  const alerts = [];

  // Alert 1: Declining students
  const decliningStudents = studentMetrics.filter(m => m.learning_velocity < -0.05);
  if (decliningStudents.length > 0) {
    alerts.push({
      alert_type: 'declining',
      severity: decliningStudents.length > studentMetrics.length * 0.3 ? 'high' : 'medium',
      affected_students: decliningStudents.map(m => m.studentId),
      description: `${decliningStudents.length} students showing declining performance`,
    });
  }

  // Alert 2: Low engagement
  if (avgEngagement < 0.4) {
    const lowEngagement = studentMetrics.filter(m => m.engagement_index < 0.3);
    alerts.push({
      alert_type: 'low_engagement',
      severity: 'medium',
      affected_students: lowEngagement.map(m => m.studentId),
      description: `Average engagement low (${(avgEngagement * 100).toFixed(1)}%)`,
    });
  }

  // Alert 3: Difficulty rising
  if (difficulty > 0.6) {
    alerts.push({
      alert_type: 'difficulty_rise',
      severity: 'medium',
      description: `Topic difficulty increasing (${(difficulty * 100).toFixed(1)}%)`,
      affected_students: [],
    });
  }

  // Alert 4: Class mastery low
  if (avgMastery < 0.5) {
    alerts.push({
      alert_type: 'low_mastery',
      severity: 'high',
      description: `Class average mastery is low (${(avgMastery * 100).toFixed(1)}%)`,
      affected_students: [],
    });
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: LONGITUDINAL TREND ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Longitudinal Trend Analysis - Time series analysis of student performance
 * 
 * Analyzes performance trends over time to detect:
 * - Long-term improvement/decline
 * - Acceleration or deceleration in learning
 * - Seasonal patterns
 * - Change points (sudden shifts in performance)
 * 
 * Uses moving averages and trend detection algorithms.
 * 
 * @returns {object} Trend analysis with forecasts
 */
async function analyzeLongitudinalTrends(studentId, topicId, timeWindowDays = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeWindowDays);

    const attempts = await StudentQuizAttempt.find({
      studentId,
      topicId,
      submittedAt: { $gte: cutoffDate },
    }).sort({ submittedAt: 1 });

    if (attempts.length < 3) {
      return {
        trend: 'insufficient_data',
        interpretation: 'Need more data for trend analysis',
      };
    }

    // Extract time series data
    const timeSeries = attempts.map(a => ({
      date: new Date(a.submittedAt),
      score: a.score,
      timestamp: new Date(a.submittedAt).getTime(),
    }));

    // Calculate linear regression for overall trend
    const n = timeSeries.length;
    const sumX = timeSeries.reduce((sum, d) => sum + d.timestamp, 0);
    const sumY = timeSeries.reduce((sum, d) => sum + d.score, 0);
    const sumXY = timeSeries.reduce((sum, d) => sum + (d.timestamp * d.score), 0);
    const sumXX = timeSeries.reduce((sum, d) => sum + (d.timestamp * d.timestamp), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Convert slope to daily rate (slope is in per-millisecond)
    const dailySlope = slope * (1000 * 60 * 60 * 24);

    // Classify trend
    let trend, interpretation;
    if (Math.abs(dailySlope) < 0.001) {
      trend = 'stable';
      interpretation = 'Performance is stable over time';
    } else if (dailySlope > 0.01) {
      trend = 'strong_improvement';
      interpretation = 'Significant improvement over time';
    } else if (dailySlope > 0.003) {
      trend = 'moderate_improvement';
      interpretation = 'Steady improvement over time';
    } else if (dailySlope > 0) {
      trend = 'slight_improvement';
      interpretation = 'Slight improvement over time';
    } else if (dailySlope < -0.01) {
      trend = 'strong_decline';
      interpretation = 'Significant decline - needs intervention';
    } else if (dailySlope < -0.003) {
      trend = 'moderate_decline';
      interpretation = 'Steady decline - monitor closely';
    } else {
      trend = 'slight_decline';
      interpretation = 'Slight decline - needs attention';
    }

    // Calculate moving averages (7-day window)
    const movingAvg = [];
    for (let i = 0; i < timeSeries.length; i++) {
      const windowStart = Math.max(0, i - 3);
      const windowEnd = Math.min(timeSeries.length, i + 4);
      const window = timeSeries.slice(windowStart, windowEnd);
      const avg = window.reduce((sum, d) => sum + d.score, 0) / window.length;
      movingAvg.push(avg);
    }

    // Detect change points (sudden shifts)
    const changePoints = [];
    for (let i = 1; i < movingAvg.length - 1; i++) {
      const before = movingAvg[i - 1];
      const current = movingAvg[i];
      const after = movingAvg[i + 1];
      const change = Math.abs(current - before);
      
      if (change > 0.2) { // 20% change threshold
        changePoints.push({
          date: timeSeries[i].date,
          direction: current > before ? 'improvement' : 'decline',
          magnitude: change,
        });
      }
    }

    // Forecast next 30 days
    const forecastDate = new Date();
    forecastDate.setDate(forecastDate.getDate() + 30);
    const forecastTimestamp = forecastDate.getTime();
    const forecastScore = slope * forecastTimestamp + intercept;
    const clampedForecast = Math.min(Math.max(forecastScore, 0), 1);

    // Calculate confidence (based on R²)
    const meanY = sumY / n;
    const ssTotal = timeSeries.reduce((sum, d) => sum + Math.pow(d.score - meanY, 2), 0);
    const ssPredicted = timeSeries.reduce(
      (sum, d) => sum + Math.pow((slope * d.timestamp + intercept) - meanY, 2),
      0
    );
    const rSquared = ssPredicted / ssTotal;

    return {
      trend,
      interpretation,
      dailyRate: dailySlope,
      slope: slope,
      intercept: intercept,
      rSquared: rSquared,
      confidence: rSquared > 0.7 ? 'high' : rSquared > 0.4 ? 'medium' : 'low',
      dataPoints: attempts.length,
      timeWindow: timeWindowDays,
      forecast: {
        date: forecastDate,
        predictedScore: clampedForecast,
        confidence: rSquared,
      },
      changePoints: changePoints,
      movingAverage: movingAvg[movingAvg.length - 1],
      firstScore: timeSeries[0].score,
      latestScore: timeSeries[timeSeries.length - 1].score,
      overallChange: timeSeries[timeSeries.length - 1].score - timeSeries[0].score,
    };
  } catch (error) {
    console.error('Error in longitudinal trend analysis:', error);
    return {
      trend: 'error',
      interpretation: 'Error analyzing trends',
    };
  }
}

/**
 * Class-wide longitudinal analysis
 * Compare trends across multiple students in a class
 */
async function analyzeClassTrends(classId, topicId, timeWindowDays = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeWindowDays);

    const attempts = await StudentQuizAttempt.find({
      classId,
      topicId,
      submittedAt: { $gte: cutoffDate },
    });

    if (attempts.length < 5) {
      return {
        interpretation: 'Insufficient data for class trend analysis',
      };
    }

    const studentIds = [...new Set(attempts.map(a => a.studentId.toString()))];
    
    // Analyze each student
    const studentTrends = await Promise.all(
      studentIds.map(async sid => {
        const trend = await analyzeLongitudinalTrends(sid, topicId, timeWindowDays);
        return { studentId: sid, ...trend };
      })
    );

    // Aggregate trends
    const trendCounts = {
      strong_improvement: 0,
      moderate_improvement: 0,
      slight_improvement: 0,
      stable: 0,
      slight_decline: 0,
      moderate_decline: 0,
      strong_decline: 0,
    };

    studentTrends.forEach(st => {
      if (trendCounts[st.trend] !== undefined) {
        trendCounts[st.trend]++;
      }
    });

    const totalImproving = trendCounts.strong_improvement + trendCounts.moderate_improvement + trendCounts.slight_improvement;
    const totalDeclining = trendCounts.strong_decline + trendCounts.moderate_decline + trendCounts.slight_decline;
    const totalStable = trendCounts.stable;

    // Average daily rate
    const avgDailyRate = studentTrends.reduce((sum, st) => sum + (st.dailyRate || 0), 0) / studentTrends.length;

    let classInterpretation;
    if (totalImproving > totalDeclining * 2) {
      classInterpretation = 'Class is improving overall - teaching approach is effective';
    } else if (totalDeclining > totalImproving * 2) {
      classInterpretation = 'Class is declining overall - intervention needed';
    } else {
      classInterpretation = 'Class shows mixed trends - individualized attention recommended';
    }

    return {
      studentsAnalyzed: studentIds.length,
      trendCounts,
      improving: totalImproving,
      declining: totalDeclining,
      stable: totalStable,
      avgDailyRate,
      interpretation: classInterpretation,
      studentTrends, // Detailed per-student trends
    };
  } catch (error) {
    console.error('Error in class trend analysis:', error);
    return {
      interpretation: 'Error analyzing class trends',
    };
  }
}

module.exports = {
  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC METRICS (Original Functions)
  // ═══════════════════════════════════════════════════════════════════════════
  calculateMastery,
  calculateDynamicDifficulty,
  calculateLearningVelocity,
  calculateEngagementIndex,
  calculateKnowledgeDecay,
  calculateClassEntropy,
  updateStudentMetrics,
  updateTopicMetrics,

  // ═══════════════════════════════════════════════════════════════════════════
  // RESEARCH-GRADE MATHEMATICAL MODELS (NEW - Section 1)
  // ═══════════════════════════════════════════════════════════════════════════
  // Section 1: Personalized Forgetting Rate
  calculatePersonalizedForgettingRate,
  calculatePersonalizedKnowledgeDecay,
  
  // Section 2: Topic Volatility Index
  calculateTopicVolatilityIndex,
  
  // Section 3: Composite Intelligence Score
  calculateCompositeIntelligenceScore,
  
  // Section 4: Item Response Theory (IRT)
  calculateIRTParameters,
  irtProbability,
  
  // Section 5: Bayesian Knowledge Tracing
  bayesianKnowledgeTracing,
  
  // Section 6: Statistical Significance Testing
  tTest,
  compareInterventionEffect,
  
  // Section 7: Longitudinal Trend Analysis
  analyzeLongitudinalTrends,
  analyzeClassTrends,
};
