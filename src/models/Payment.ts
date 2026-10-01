import { Schema, type Model } from 'mongoose';
import { defineSchema, model, PAYMENT_STATUSES } from './common';
import type { PaymentDoc } from './types';

const RefundSchema = defineSchema(
  {
    amount: { type: Number, default: 0 },
    refundId: { type: String, default: '' },
    status: { type: String, default: '' },
    at: { type: Date },
    reason: { type: String, default: '', maxlength: 300 },
  },
  { _id: false },
);

const PaymentSchema = defineSchema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tournament: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
      index: true,
    },
    registration: {
      type: Schema.Types.ObjectId,
      ref: 'TournamentRegistration',
      default: null,
    },
    invoiceNumber: { type: String, unique: true, required: true },
    amount: { type: Number, required: true, min: 0 }, // stored in paise
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'created',
      index: true,
    },
    method: { type: String, default: '', maxlength: 30 },
    razorpayOrderId: { type: String, unique: true, sparse: true, index: true },
    razorpayPaymentId: { type: String, unique: true, sparse: true, index: true },
    razorpaySignature: { type: String, select: false },
    /** Idempotency key prevents duplicate payment records/charges. */
    idempotencyKey: { type: String, unique: true, sparse: true },
    refund: { type: RefundSchema, default: () => ({}) },
    failureReason: { type: String, default: '', maxlength: 500 },
    webhookEvents: [{ type: String }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    paidAt: { type: Date },
    refundedAt: { type: Date },
    capturedAt: { type: Date },
    ip: { type: String, select: false, default: '' },
  },
  { timestamps: true },
);

PaymentSchema.index({ user: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ tournament: 1, status: 1 });

export type { PaymentDoc } from './types';
export const PaymentModel = model('Payment', PaymentSchema) as unknown as Model<PaymentDoc>;
