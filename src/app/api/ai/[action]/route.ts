import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handler, jsonOk, parseBody, parseQuery, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { requireSession, hasRole } from '@/lib/auth';
import { aiChatSchema } from '@/lib/validation';
import {
  askAdminAssistant,
  askPlayerAssistant,
  getAIStatus,
  getConversation,
  listConversations,
} from '@/services/ai.service';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

/**
 * GET/POST /api/ai/[action]
 *  - chat          (POST) player assistant — scoped to the signed-in user
 *  - admin         (POST) admin assistant — role-gated analytics
 *  - conversations (GET)
 *  - conversation  (GET ?id=)
 *  - status        (GET)
 */
export const GET = handler(async (req: NextRequest, ctx: { params: Promise<{ action: string }> }) => {
  limitFor(req, 'ai');
  const { action } = await ctx.params;
  const session = await requireSession();

  switch (action) {
    case 'status':
      return jsonOk(serialize(getAIStatus()));
    case 'conversations': {
      const items = await listConversations(session.user.id);
      return jsonOk(serialize({ items }));
    }
    case 'conversation': {
      const id = new URL(req.url).searchParams.get('id') ?? '';
      const conversation = await getConversation(session.user.id, id);
      if (!conversation) throw new NotFoundError('Conversation not found');
      return jsonOk(serialize({ conversation }));
    }
    default:
      return jsonOk({ error: { code: 'NOT_FOUND', message: 'Unknown action' } }, { status: 404 });
  }
});

export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ action: string }> }) => {
  const { action } = await ctx.params;
  const session = await requireSession();

  switch (action) {
    case 'chat': {
      limitFor(req, 'ai', session.user.id);
      const body = await parseBody(req, aiChatSchema);
      const answer = await askPlayerAssistant(session.user, body.message, body.conversationId);
      return jsonOk(serialize(answer));
    }
    case 'admin': {
      limitFor(req, 'ai', session.user.id);
      if (!hasRole(session.user, 'moderator')) {
        throw new ForbiddenError('Admin assistant requires moderator access or higher.');
      }
      const body = await parseBody(req, aiChatSchema);
      const answer = await askAdminAssistant(session.user, body.message, body.conversationId);
      return jsonOk(serialize(answer));
    }
    default:
      return jsonOk({ error: { code: 'NOT_FOUND', message: 'Unknown action' } }, { status: 404 });
  }
});

void z;
