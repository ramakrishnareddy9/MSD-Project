/**
 * Mongoose Soft-Delete Plugin
 *
 * Adds `isDeleted` (Boolean) and `deletedAt` (Date) fields to any schema.
 * Automatically filters out soft-deleted documents on standard query operations.
 *
 * Usage:
 *   import { softDeletePlugin } from '../utils/softDelete.plugin.js';
 *   mySchema.plugin(softDeletePlugin);
 *
 * Instance methods:
 *   doc.softDelete()   – marks the document as deleted
 *   doc.restore()      – restores a soft-deleted document
 *
 * Static methods:
 *   Model.findIncludingDeleted(filter)  – bypasses the isDeleted filter
 *   Model.findDeleted(filter)           – returns only soft-deleted documents
 */

export function softDeletePlugin(schema) {
  // ── Fields ────────────────────────────────────────────────────────────
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null }
  });

  // ── Query middleware – auto-filter on reads ───────────────────────────
  const autoFilterMethods = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'findOneAndReplace',
    'countDocuments',
    'estimatedDocumentCount',
    'updateMany',
    'updateOne'
  ];

  autoFilterMethods.forEach((method) => {
    schema.pre(method, function () {
      // Only add the filter when the caller hasn't explicitly set isDeleted
      const filter = this.getFilter?.() || this.getQuery?.() || {};
      if (filter.isDeleted === undefined && filter.$or === undefined) {
        this.where({ isDeleted: { $ne: true } });
      }
    });
  });

  // Aggregate middleware — exclude soft-deleted by default
  schema.pre('aggregate', function () {
    const pipeline = this.pipeline();
    // Only prepend filter if the first stage isn't already matching on isDeleted
    const firstStage = pipeline[0];
    if (!firstStage?.$match?.isDeleted) {
      pipeline.unshift({ $match: { isDeleted: { $ne: true } } });
    }
  });

  // ── Instance methods ──────────────────────────────────────────────────
  schema.methods.softDelete = function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
  };

  schema.methods.restore = function () {
    this.isDeleted = false;
    this.deletedAt = null;
    return this.save();
  };

  // ── Static helpers ────────────────────────────────────────────────────
  schema.statics.findIncludingDeleted = function (filter = {}) {
    return this.find({ ...filter, isDeleted: { $in: [true, false] } });
  };

  schema.statics.findDeleted = function (filter = {}) {
    return this.find({ ...filter, isDeleted: true });
  };

  schema.statics.softDeleteMany = function (filter = {}) {
    return this.updateMany(filter, {
      $set: { isDeleted: true, deletedAt: new Date() }
    });
  };

  schema.statics.restoreMany = function (filter = {}) {
    return this.updateMany(
      { ...filter, isDeleted: true },
      { $set: { isDeleted: false, deletedAt: null } }
    );
  };
}

export default softDeletePlugin;
