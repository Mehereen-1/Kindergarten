import mongoose, { Schema, Document } from 'mongoose';

export interface IFacialEmbedding extends Document {
  studentId: mongoose.Types.ObjectId;
  embedding: number[]; // 512-dimensional vector from insightface
  imageUrl?: string;
  imageHash?: string; // To avoid duplicate images
  uploadedAt: Date;
}

export interface IFacialDatabase extends Document {
  studentId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  numberOfSamples: number;
  embeddings: IFacialEmbedding[];
  previewImageUrl?: string;
  lastUpdated: Date;
  isProcessed: boolean;
  confidence: number; // Average confidence for this student
  createdAt: Date;
  updatedAt: Date;
}

const FacialEmbeddingSchema: Schema = new Schema({
  student_id: { type: Schema.Types.ObjectId, ref: 'Student', required: true, alias: 'studentId' },
  embedding: { type: [Number], required: true }, // 512-dimensional vector
  image_url: { type: String, alias: 'imageUrl' },
  image_hash: { type: String, unique: true, sparse: true, alias: 'imageHash' },
  uploaded_at: { type: Date, default: Date.now, alias: 'uploadedAt' },
});

const FacialDatabaseSchema: Schema = new Schema(
  {
    student_id: { type: Schema.Types.ObjectId, ref: 'Student', required: true, unique: true, alias: 'studentId' },
    class_id: { type: Schema.Types.ObjectId, ref: 'Class', alias: 'classId' },
    number_of_samples: { type: Number, default: 0, alias: 'numberOfSamples' },
    embeddings: [FacialEmbeddingSchema],
    preview_image_url: { type: String, alias: 'previewImageUrl' },
    last_updated: { type: Date, default: Date.now, alias: 'lastUpdated' },
    is_processed: { type: Boolean, default: false, alias: 'isProcessed' },
    confidence: { type: Number, default: 0 }, // 0-1 confidence score
  },
  {
    timestamps: true,
    collection: 'facial_database', // Explicit collection name to match Python backend
  }
);

// Index for efficient queries
FacialDatabaseSchema.index({ studentId: 1, classId: 1 });
FacialEmbeddingSchema.index({ studentId: 1 });

export const FacialEmbedding = mongoose.models.FacialEmbedding || 
  mongoose.model<IFacialEmbedding>('FacialEmbedding', FacialEmbeddingSchema);

export default mongoose.models.FacialDatabase || 
  mongoose.model<IFacialDatabase>('FacialDatabase', FacialDatabaseSchema);
