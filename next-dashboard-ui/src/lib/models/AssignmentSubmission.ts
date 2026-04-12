import mongoose, { Document, Schema } from 'mongoose';

export interface IAssignmentSubmission extends Document {
  assignmentId: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  studentName: string;
  handwritingImageName?: string;
  ocrText: string;
  finalText: string;
  similarity: number;
  ocrConfidence: number;
  autoScore: number;
  finalScore: number;
  autoFeedback: string;
  finalFeedback: string;
  badge: string;
  matchedWords: string[];
  missingWords: string[];
  evaluationBreakdown?: {
    jaccard: number;
    f1: number;
    editSimilarity: number;
    weightedSimilarity: number;
  };
  reviewStatus: 'pending' | 'reviewed';
  issueStatus: 'none' | 'open' | 'resolved';
  issueReported: boolean;
  issueMessage?: string;
  issueReportedAt?: Date;
  issueResolvedAt?: Date;
  issueResolvedBy?: mongoose.Types.ObjectId;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSubmissionSchema: Schema = new Schema(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    studentName: { type: String, required: true, trim: true },
    handwritingImageName: { type: String, default: '' },
    ocrText: { type: String, default: '' },
    finalText: { type: String, default: '' },
    similarity: { type: Number, default: 0 },
    ocrConfidence: { type: Number, default: 0 },
    autoScore: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
    autoFeedback: { type: String, default: '' },
    finalFeedback: { type: String, default: '' },
    badge: { type: String, default: '' },
    matchedWords: { type: [String], default: [] },
    missingWords: { type: [String], default: [] },
    evaluationBreakdown: {
      jaccard: { type: Number, default: 0 },
      f1: { type: Number, default: 0 },
      editSimilarity: { type: Number, default: 0 },
      weightedSimilarity: { type: Number, default: 0 },
    },
    reviewStatus: {
      type: String,
      enum: ['pending', 'reviewed'],
      default: 'pending',
      index: true,
    },
    issueStatus: {
      type: String,
      enum: ['none', 'open', 'resolved'],
      default: 'none',
      index: true,
    },
    issueReported: { type: Boolean, default: false },
    issueMessage: { type: String, default: '' },
    issueReportedAt: { type: Date },
    issueResolvedAt: { type: Date },
    issueResolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

AssignmentSubmissionSchema.index({ assignmentId: 1, createdAt: -1 });
AssignmentSubmissionSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.models.AssignmentSubmission ||
  mongoose.model<IAssignmentSubmission>('AssignmentSubmission', AssignmentSubmissionSchema);
