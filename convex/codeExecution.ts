// convex/codeExecution.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const executeCode = mutation({
  args: {
    sessionId: v.string(),
    userId: v.string(),
    code: v.string(),
    language: v.string(),
    input: v.optional(v.string()),
    output: v.string(),
    error: v.string(),
    status: v.string(),
    executionTime: v.number(),
    memory: v.number(),
  },
  handler: async (ctx, args) => {
    // Just store the execution result in database
    await ctx.db.insert("codeExecutions", {
      sessionId: args.sessionId,
      userId: args.userId,
      code: args.code,
      language: args.language,
      input: args.input || "",
      output: args.output,
      error: args.error,
      status: args.status,
      executionTime: args.executionTime,
      memory: args.memory,
      createdAt: Date.now(),
    });

    return {
      success: args.status === "Finished",
      output: args.output,
      error: args.error,
      status: args.status,
      time: args.executionTime,
      memory: args.memory
    };
  },
});

export const getExecutionHistory = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("codeExecutions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(10);
  },
});