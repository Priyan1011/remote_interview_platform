import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// KEEP ALL YOUR ORIGINAL QUERIES AND MUTATIONS:

export const getAllInterviews = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interviews = await ctx.db.query("interviews").collect();

    return interviews;
  },
});

export const getMyInterviews = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const interviews = await ctx.db
      .query("interviews")
      .withIndex("by_candidate_id", (q) => q.eq("candidateId", identity.subject))
      .collect();

    return interviews!;
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

export const getCandidateInterviewsWithComments = query({
  args: { candidateId: v.string() },
  handler: async (ctx, { candidateId }) => {
    // Fetch interviews for candidate
    let interviews = await ctx.db
      .query("interviews")
      .filter((q) => q.eq(q.field("candidateId"), candidateId))
      .collect();

    // Fetch related comments, grouped by interviewId
    const interviewIds = interviews.map(i => i._id);
    const comments = await ctx.db
      .query("comments")
      .filter((q) =>
        interviewIds
          .map(id => q.eq(q.field("interviewId"), id))
          .reduce((prev, curr) => q.or(prev, curr))
      )
      .collect();

    // Map comments to interviews
    const commentsMap = new Map();
    for (const comment of comments) {
      commentsMap.set(comment.interviewId, comment);
    }

    // Attach comments to interviews
    return interviews.map(interview => ({
      ...interview,
      comment: commentsMap.get(interview._id) || null,
    }));
  },
});

// ADD THE NEW FUNCTIONS BELOW (DON'T REMOVE ANYTHING ABOVE):

// ADD THIS MUTATION FOR UPDATING INTERVIEW RESULTS
export const updateInterviewResult = mutation({
  args: {
    id: v.id("interviews"),
    result: v.union(v.literal("passed"), v.literal("failed")),
    overallRating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.patch(args.id, {
      result: args.result,
      overallRating: args.overallRating,
      status: "completed",
      endTime: Date.now(),
    });
  },
});

// UPDATE THE EXISTING updateInterviewStatus MUTATION (KEEP THE ORIGINAL TOO)
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
    };

    if (args.status === "completed") {
      updateData.endTime = Date.now();
    }

    if (args.result) {
      updateData.result = args.result;
    }

    if (args.overallRating) {
      updateData.overallRating = args.overallRating;
    }

    return await ctx.db.patch(args.id, updateData);
  },
});

// ADD THIS QUERY FOR CANDIDATE DASHBOARD - KEEP ONLY THIS ONE (REMOVE THE DUPLICATE)


export const getCandidateDashboardData = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get all interviews for the current candidate
    const interviews = await ctx.db
      .query("interviews")
      .withIndex("by_candidate_id", (q) => q.eq("candidateId", identity.subject))
      .collect();

    // If no interviews, return empty array
    if (interviews.length === 0) {
      return [];
    }

    // Get comments for these interviews
    const interviewIds = interviews.map(i => i._id);
    
    let comments: any[] = [];
    
    if (interviewIds.length > 0) {
      // Build OR condition safely without reduce
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