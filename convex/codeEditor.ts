// convex/codeEditor.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getCodeSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("codeEditorSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});

export const updateCode = mutation({
  args: {
    sessionId: v.string(),
    code: v.string(),
    language: v.string(),
    questionId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("codeEditorSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        code: args.code,
        language: args.language,
        questionId: args.questionId,
        lastUpdated: Date.now(),
        userId: args.userId,
      });
    } else {
      await ctx.db.insert("codeEditorSessions", {
        sessionId: args.sessionId,
        code: args.code,
        language: args.language,
        questionId: args.questionId,
        lastUpdated: Date.now(),
        userId: args.userId,
      });
    }
  },
});

export const updateLanguage = mutation({
  args: {
    sessionId: v.string(),
    language: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("codeEditorSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        language: args.language,
        lastUpdated: Date.now(),
        userId: args.userId,
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
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("codeEditorSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        questionId: args.questionId,
        code: args.code,
        lastUpdated: Date.now(),
        userId: args.userId,
      });
    }
  },
});