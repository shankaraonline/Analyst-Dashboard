import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    website: {
      type: String,
      trim: true,
      default: ''
    },
    categories: {
      type: [String],
      default: ['facebook', 'instagram', 'youtube', 'linkedin']
    },
    googleSheetUrl: {
      type: String,
      trim: true,
      default: ''
    },
    lastSyncedAt: {
      type: String,
      default: null
    },
    color: {
      type: String,
      default: '#6366F1'
    },
    description: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const Project = mongoose.model('Project', ProjectSchema);
