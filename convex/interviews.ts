import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAllInterviews = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return await ctx.db.query("interviews").collect();
  },
});

export const getMyInterviews = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("interviews")
      .withIndex("by_candidate_id", (q) => q.eq("candidateId", identity.subject))
      .collect();
  },
});

export const getCandidateDashboardData = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get interviews for current candidate
    const interviews = await ctx.db
      .query("interviews")
      .withIndex("by_candidate_id", (q) => q.eq("candidateId", identity.subject))
      .collect();

    if (interviews.length === 0) return [];

    // Get comments for these interviews
    const interviewIds = interviews.map(i => i._id);
    let comments: any[] = [];

    if (interviewIds.length > 0) {
      comments = await ctx.db
        .query("comments")
        .filter((q) => {
          let condition = q.eq(q.field("interviewId"), interviewIds[0]);
          for (let i = 1; i < interviewIds.length; i++) {
            condition = q.or(condition, q.eq(q.field("interviewId"), interviewIds[i]));
          }
          return condition;
        })
        .collect();
    }

    // Group comments by interview ID
    const commentsMap = new Map();
    comments.forEach(comment => {
      if (!commentsMap.has(comment.interviewId)) {
        commentsMap.set(comment.interviewId, []);
      }
      commentsMap.get(comment.interviewId).push(comment);
    });

    // Combine data
    return interviews.map(interview => ({
      ...interview,
      comments: commentsMap.get(interview._id) || [],
    }));
  },
});

// MISSING FUNCTIONS - ADD THESE BACK:
export const createInterview = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    status: v.string(),
    streamCallId: v.string(),
    candidateId: v.string(),
    interviewerIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("interviews", {
      ...args,
    });
  },
});

export const getInterviewByStreamCallId = query({
  args: { streamCallId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("interviews")
      .withIndex("by_stream_call_id", (q) => q.eq("streamCallId", args.streamCallId))
      .first();
  },
});

export const updateInterviewStatus = mutation({
  args: {
    id: v.id("interviews"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.status === "completed" ? { endTime: Date.now() } : {}),
    });
  },
});

export const updateInterviewStatusWithResult = mutation({
  args: {
    id: v.id("interviews"),
    status: v.string(),
    result: v.optional(v.union(v.literal("passed"), v.literal("failed"))),
    overallRating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updateData: any = {
      status: args.status,
      ...(args.status === "completed" ? { endTime: Date.now() } : {}),
    };

    if (args.result) {
      updateData.result = args.result;
    }

    if (args.overallRating) {
      updateData.overallRating = args.overallRating;
    }

    return await ctx.db.patch(args.id, updateData);
  },
});
