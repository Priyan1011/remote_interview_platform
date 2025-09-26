import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const updateCode = mutation({
  args: {
    sessionId: v.string(),
    code: v.string(),
    language: v.string(),
    questionId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { sessionId, code, language, questionId, userId }) => {
    const existing = await ctx.db
      .query("codeEditorSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        code,
        language,
        questionId,
        lastUpdated: Date.now(),
        userId,
      });
    } else {
      await ctx.db.insert("codeEditorSessions", {
        sessionId,
        code,
        language,
        questionId,
        lastUpdated: Date.now(),
        userId,
      });
    }
  },
});

export const getCodeSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("codeEditorSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
  },
});

export const updateLanguage = mutation({
  args: {
    sessionId: v.string(),
    language: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { sessionId, language, userId }) => {
    const existing = await ctx.db
      .query("codeEditorSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        language,
        lastUpdated: Date.now(),
        userId,
      });
    }
  },
});

export const updateQuestion = mutation({
  args: {
    sessionId: v.string(),
    questionId: v.string(),
    code: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { sessionId, questionId, code, userId }) => {
    const existing = await ctx.db
      .query("codeEditorSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        questionId,
        code,
        lastUpdated: Date.now(),
        userId,
      });
    } else {
      await ctx.db.insert("codeEditorSessions", {
        sessionId,
        questionId,
        code,
        language: "javascript", // default
        lastUpdated: Date.now(),
        userId,
      });
    }
  },
});
