import mongoose from 'mongoose';

/**
 * Lightweight Project Metadata Schema
 * Stores ONLY Project Name, Website, Description, Color, and Google Sheet Link.
 * Tab row data is parsed dynamically in-memory and NOT saved in MongoDB to keep the database ultra-lightweight.
 */
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
    description: {
      type: String,
      trim: true,
      default: ''
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
    kpiVisibility: {
      // { [tabId]: string[] } — admin-selected metric column keys to show in Omnichannel view
      type: mongoose.Schema.Types.Mixed,
      default: {}
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
