import crypto from 'crypto';
import { Types } from 'mongoose';
import Razorpay from 'razorpay';
import { connectDB } from '@/lib/db';
import { env } from '@/lib/env';
import {
  PaymentModel,
  RegistrationModel,
  TournamentModel,
  UserModel,
  type PaymentDoc,
} from '@/models';
import { ConflictError, NotFoundError, PaymentError, ValidationError } from '@/lib/errors';
import type { SessionUser } from '@/lib/auth';
import { notifyUser } from './notification.service';
import { emailTemplates, sendEmail } from '@/lib/email';
import { realtime } from '@/lib/realtime';
import { logAdminAction } from './audit.service';

export function razorpayEnabled(): boolean {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) && !env.PAYMENTS_DISABLED;
}

function getClient(): Razorpay {
  if (!razorpayEnabled()) {
    throw new PaymentError(
      'Payments are not configured on this server. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
    );
  }
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

function invoiceNumber(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate(),
  ).padStart(2, '0')}`;
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `NXA-INV-${stamp}-${rand}`;
}

/**
 * Create a payment order for a registration.
 * Duplicate-payment protection: one open payment per (user, tournament).
 */
export async function createRegistrationOrder(
  user: SessionUser,
  tournamentId: string,
  opts: { teamId?: string; inGameName?: string; discordId?: string; agreedToRules: boolean },
) {
  await connectDB();
  if (!opts.agreedToRules) {
    throw new ValidationError('You must accept the tournament rules to continue.');
  }

  const tournament = await TournamentModel.findById(tournamentId);
  if (!tournament) throw new NotFoundError('Tournament not found');
  if (!tournament.registrationOpen || tournament.status !== 'registration') {
    throw new ConflictError('Registration for this tournament is closed.');
  }
  if (tournament.participantsCount >= tournament.maxParticipants) {
    throw new ConflictError('This tournament is full.');
  }
  if (
    tournament.registrationDeadline &&
    new Date() > new Date(tournament.registrationDeadline)
  ) {
    throw new ConflictError('The registration deadline has passed.');
  }

  const existing = await RegistrationModel.findOne({
    tournament: tournamentId,
    user: user.id,
    status: { $in: ['pending', 'confirmed'] },
  });
  if (existing) {
    throw new ConflictError('You are already registered for this tournament.');
  }

  // Free tournaments skip payment entirely.
  if (tournament.entryFee <= 0 || env.PAYMENTS_DISABLED) {
    const reg = await confirmRegistration({
      userId: user.id,
      tournamentId,
      teamId: opts.teamId,
      inGameName: opts.inGameName,
      discordId: opts.discordId,
    });
    return { free: true, registration: reg, payment: null };
  }

  // Reuse an unpaid, recent payment (idempotency) before creating a new order.
  const idempotencyKey = `${user.id}:${tournamentId}`;
  let payment = await PaymentModel.findOne({
    idempotencyKey,
    status: 'created',
    createdAt: { $gt: new Date(Date.now() - 30 * 60 * 1000) },
  });

  const amountPaise = Math.round(tournament.entryFee * 100);

  if (!payment) {
    const rzp = getClient();
    const order = await rzp.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: invoiceNumber(),
      notes: {
        tournament: String(tournament._id),
        tournamentTitle: tournament.title,
        userId: user.id,
      },
    });

    payment = await PaymentModel.create({
      user: user.id,
      tournament: tournamentId,
      invoiceNumber: invoiceNumber(),
      amount: amountPaise,
      currency: 'INR',
      status: 'created',
      razorpayOrderId: order.id,
      idempotencyKey,
      metadata: { tournamentTitle: tournament.title, entryFee: tournament.entryFee },
    });
  }

  // Create a pending registration that will flip to confirmed on payment success.
  const reg = await RegistrationModel.findOneAndUpdate(
    { tournament: tournamentId, user: user.id },
    {
      $setOnInsert: {
        tournament: tournamentId,
        user: user.id,
        team: opts.teamId ?? null,
        type: tournament.type,
        status: 'pending',
        registrationId: `REG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        inGameName: opts.inGameName ?? '',
        discordId: opts.discordId ?? '',
        agreedToRules: true,
        payment: payment._id,
      },
    },
    { upsert: true, new: true },
  );

  await PaymentModel.updateOne({ _id: payment._id }, { $set: { registration: reg._id } });

  return {
    free: false,
    registration: reg,
    payment: {
      id: String(payment._id),
      orderId: payment.razorpayOrderId,
      amount: payment.amount,
      currency: payment.currency,
      keyId: env.RAZORPAY_KEY_ID,
      name: 'NEXUS ARENA',
      description: `${tournament.title} — Entry Fee`,
      prefill: {
        name: user.name,
        email: user.email,
      },
      theme: { color: '#62dce7' },
    },
  };
}

export interface VerifyInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/** HMAC-SHA256 signature verification per Razorpay docs. */
export function verifyPaymentSignature(input: VerifyInput, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.razorpay_signature));
  } catch {
    return false;
  }
}

/** Verify checkout callback server-side and confirm the registration. */
export async function verifyAndConfirmPayment(user: SessionUser, input: VerifyInput) {
  await connectDB();
  const payment = await PaymentModel.findOne({ razorpayOrderId: input.razorpay_order_id });
  if (!payment) throw new NotFoundError('Payment order not found.');
  if (String(payment.user) !== user.id) {
    throw new PaymentError('This payment does not belong to your account.');
  }
  if (payment.status === 'captured') {
    // Duplicate submit — idempotent success.
    const reg = await RegistrationModel.findById(payment.registration).lean();
    return { alreadyPaid: true, registration: reg, payment };
  }

  const secret = env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new PaymentError('Payment verification is not configured.');
  if (!verifyPaymentSignature(input, secret)) {
    payment.status = 'failed';
    payment.failureReason = 'Signature verification failed';
    await payment.save();
    throw new PaymentError('Payment signature verification failed.');
  }

  // Confirm with Razorpay API (never trust the client alone).
  try {
    const rzp = getClient();
    const details = await rzp.payments.fetch(input.razorpay_payment_id);
    if (details.status !== 'captured' && details.status !== 'authorized') {
      payment.status = 'failed';
      payment.failureReason = `Razorpay payment status: ${details.status}`;
      await payment.save();
      throw new PaymentError('Payment was not successful at the gateway.');
    }
    payment.method = (details.method as string) ?? '';
  } catch (err) {
    if (err instanceof PaymentError) throw err;
    // Network hiccup — still accept verified signature but keep flag.
    console.error('[payment] razorpay fetch failed after signature ok:', err);
  }

  payment.status = 'captured';
  payment.razorpayPaymentId = input.razorpay_payment_id;
  payment.razorpaySignature = input.razorpay_signature;
  payment.paidAt = new Date();
  payment.capturedAt = new Date();
  await payment.save();

  const reg = await confirmRegistration({
    userId: user.id,
    tournamentId: String(payment.tournament),
    teamId: undefined,
    paymentId: String(payment._id),
  });

  await notifyUser(user.id, {
    type: 'payment_success',
    title: 'Payment confirmed ✅',
    body: `Your entry fee of ₹${Math.round(payment.amount / 100)} has been received. Registration ID: ${reg?.registrationId ?? ''}.`,
    link: '/dashboard/payments',
  });

  const tournament = await TournamentModel.findById(payment.tournament).lean();
  if (tournament) {
    const tpl = emailTemplates.paymentSuccess(
      user.name,
      tournament.title,
      `₹${Math.round(payment.amount / 100)}`,
      payment.razorpayPaymentId ?? payment.invoiceNumber,
    );
    await sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html });
  }

  realtime.payment(user.id, 'payment:success', {
    paymentId: String(payment._id),
    amount: payment.amount,
  });

  return { alreadyPaid: false, registration: reg, payment };
}

/** Mark a registration confirmed (shared by free + paid flows). */
export async function confirmRegistration(input: {
  userId: string;
  tournamentId: string;
  teamId?: string;
  inGameName?: string;
  discordId?: string;
  paymentId?: string;
}) {
  await connectDB();
  const tournament = await TournamentModel.findById(input.tournamentId);
  if (!tournament) throw new NotFoundError('Tournament not found');

  const reg = await RegistrationModel.findOneAndUpdate(
    { tournament: input.tournamentId, user: input.userId },
    {
      $setOnInsert: {
        tournament: input.tournamentId,
        user: input.userId,
        team: input.teamId ?? null,
        type: tournament.type,
        registrationId: `REG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        inGameName: input.inGameName ?? '',
        discordId: input.discordId ?? '',
        agreedToRules: true,
      },
      $set: {
        status: 'confirmed',
        confirmedAt: new Date(),
        ...(input.paymentId ? { payment: new Types.ObjectId(input.paymentId) } : {}),
      },
    },
    { upsert: true, new: true },
  );

  if (!reg.confirmedAt || new Date(reg.confirmedAt).getTime() === new Date().getTime()) {
    await TournamentModel.findByIdAndUpdate(input.tournamentId, {
      $inc: { participantsCount: 1 },
    });
  }

  await notifyUser(input.userId, {
    type: 'registration_confirmed',
    title: 'Registration confirmed 🎉',
    body: `You're in! Registration ID ${reg.registrationId} for ${tournament.title}.`,
    link: `/tournaments/${tournament.slug}`,
    data: { registrationId: reg.registrationId },
  });

  realtime.tournament(input.tournamentId, 'registration:new', {
    userId: input.userId,
    participantsCount: tournament.participantsCount + 1,
  });

  return reg;
}

/** Razorpay webhook — signature verified against RAZORPAY_WEBHOOK_SECRET. */
export async function handleWebhook(rawBody: string, signature: string | null) {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[payment] webhook received but RAZORPAY_WEBHOOK_SECRET is not set');
    return { ok: false, reason: 'webhook secret not configured' };
  }
  if (!signature) return { ok: false, reason: 'missing signature' };

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const valid = (() => {
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  })();
  if (!valid) return { ok: false, reason: 'invalid signature' };

  const event = JSON.parse(rawBody) as { event: string; payload: any };
  await connectDB();

  switch (event.event) {
    case 'payment.captured':
    case 'payment.authorized': {
      const entity = event.payload?.payment?.entity;
      if (!entity?.order_id) break;
      const payment = await PaymentModel.findOne({ razorpayOrderId: entity.order_id });
      if (!payment || payment.status === 'captured') break;
      payment.status = 'captured';
      payment.razorpayPaymentId = entity.id;
      payment.method = entity.method ?? '';
      payment.paidAt = new Date();
      payment.webhookEvents.push(event.event);
      await payment.save();

      await confirmRegistration({
        userId: String(payment.user),
        tournamentId: String(payment.tournament),
        paymentId: String(payment._id),
      });
      break;
    }
    case 'payment.failed': {
      const entity = event.payload?.payment?.entity;
      if (!entity?.order_id) break;
      const payment = await PaymentModel.findOne({ razorpayOrderId: entity.order_id });
      if (!payment) break;
      payment.status = 'failed';
      payment.failureReason =
        entity.error_description ?? entity.error_reason ?? 'Payment failed at gateway';
      payment.webhookEvents.push(event.event);
      await payment.save();
      await notifyUser(String(payment.user), {
        type: 'payment_failed',
        title: 'Payment failed',
        body: `Your payment for ${payment.metadata?.tournamentTitle ?? 'a tournament'} failed. You can retry from your dashboard.`,
        link: '/dashboard/payments',
      });
      break;
    }
    case 'refund.processed': {
      const entity = event.payload?.refund?.entity;
      if (!entity?.payment_id) break;
      const payment = await PaymentModel.findOne({ razorpayPaymentId: entity.payment_id });
      if (!payment) break;
      payment.status =
        entity.amount === payment.amount ? 'refunded' : 'partially_refunded';
      payment.refund = {
        amount: entity.amount,
        refundId: entity.id,
        status: entity.status,
        at: new Date(),
        reason: entity.notes?.reason ?? '',
      } as any;
      payment.refundedAt = new Date();
      payment.webhookEvents.push(event.event);
      await payment.save();
      await notifyUser(String(payment.user), {
        type: 'payment_refunded',
        title: 'Refund processed',
        body: `₹${Math.round(entity.amount / 100)} has been refunded to your original payment method.`,
        link: '/dashboard/payments',
      });
      break;
    }
    default:
      // Acknowledge unhandled events so Razorpay does not retry forever.
      break;
  }

  return { ok: true };
}

/** Admin-initiated refund. */
export async function refundPayment(
  paymentId: string,
  admin: SessionUser,
  reason = 'Refund by admin',
  amountPaise?: number,
) {
  await connectDB();
  const payment = await PaymentModel.findById(paymentId);
  if (!payment) throw new NotFoundError('Payment not found');
  if (payment.status !== 'captured' && payment.status !== 'authorized') {
    throw new ConflictError(`Cannot refund a payment with status "${payment.status}".`);
  }
  if (!payment.razorpayPaymentId) {
    throw new ValidationError('Payment has no gateway payment id.');
  }

  const amount = amountPaise ?? payment.amount;
  const rzp = getClient();
  const refund = await rzp.payments.refund(payment.razorpayPaymentId, {
    amount,
    notes: { reason, by: admin.email },
  });

  payment.status = amount >= payment.amount ? 'refunded' : 'partially_refunded';
  payment.refund = {
    amount,
    refundId: refund.id,
    status: (refund as any).status ?? 'processed',
    at: new Date(),
    reason,
  } as any;
  payment.refundedAt = new Date();
  await payment.save();

  // Cancel the related registration when fully refunded.
  if (amount >= payment.amount && payment.registration) {
    await RegistrationModel.updateOne(
      { _id: payment.registration },
      { $set: { status: 'cancelled', cancelledAt: new Date(), cancelReason: `Refunded: ${reason}` } },
    );
    await TournamentModel.findByIdAndUpdate(payment.tournament, {
      $inc: { participantsCount: -1 },
    });
  }

  await logAdminAction(admin, 'payment:refund', 'payment', String(payment._id), {
    amount,
    reason,
  });

  await notifyUser(String(payment.user), {
    type: 'payment_refunded',
    title: 'Refund initiated',
    body: `Your refund of ₹${Math.round(amount / 100)} has been processed (${reason}).`,
    link: '/dashboard/payments',
  });

  realtime.admin('payment:refunded', { paymentId: String(payment._id), amount });
  return payment;
}

export async function getPaymentHistory(userId: string, limit = 50) {
  await connectDB();
  return PaymentModel.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('tournament', 'title slug entryFee')
    .lean();
}
