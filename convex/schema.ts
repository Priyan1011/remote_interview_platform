import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    role: v.union(v.literal("candidate"), v.literal("interviewer")),
    clerkId: v.string(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]), // ADD THIS INDEX

  interviews: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    status: v.string(),
    streamCallId: v.string(),
    candidateId: v.string(),
    candidateEmail: v.optional(v.string()), // ADD THIS
    candidateName: v.optional(v.string()),  // ADD THIS
    interviewerIds: v.array(v.string()),
    result: v.optional(v.union(v.literal("passed"), v.literal("failed"))),
    overallRating: v.optional(v.number()),
  })
    .index("by_candidate_id", ["candidateId"])
    .index("by_stream_call_id", ["streamCallId"])
    .index("by_status", ["status"]), // ADD THIS INDEX

  comments: defineTable({
    content: v.string(),
    rating: v.number(),
    interviewerId: v.string(),
    interviewId: v.id("interviews"),
  }).index("by_interview_id", ["interviewId"]),

  codeEditorSessions: defineTable({
    sessionId: v.string(),
    code: v.string(),
    language: v.string(),
    questionId: v.string(),
    lastUpdated: v.number(),
    userId: v.string(),
  }).index("by_session", ["sessionId"]),

  codeExecutions: defineTable({
    sessionId: v.string(),
    userId: v.string(),
    code: v.string(),
    language: v.string(),
    input: v.string(),
    output: v.string(),
    error: v.string(),
    status: v.string(),
    executionTime: v.number(),
    memory: v.number(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),
});