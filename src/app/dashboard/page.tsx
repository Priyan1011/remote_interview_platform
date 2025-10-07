"use client";

import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import toast from "react-hot-toast";
import LoaderUI from "@/components/LoaderUI";
import { useUserRole } from "@/hooks/useUserRole";
import { getCandidateInfo, groupInterviews } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarIcon, CheckCircle2Icon, ClockIcon, XCircleIcon, MessageSquareIcon, StarIcon, UserIcon } from "lucide-react";
import { format } from "date-fns";
import CommentDialog from "@/components/CommentDialog";

// Define interview categories for interviewer view
const INTERVIEW_CATEGORY = [
  { id: "upcoming", title: "Upcoming Interviews", variant: "default" as const },
  { id: "completed", title: "Completed Interviews", variant: "secondary" as const },
  { id: "succeeded", title: "Passed Interviews", variant: "default" as const },
  { id: "failed", title: "Failed Interviews", variant: "destructive" as const },
];

// Interview interface matching Convex schema
interface Interview {
  _id: Id<"interviews">;
  _creationTime: number;
  title: string;
  description?: string;
  startTime: number;
  endTime?: number;
  status: string;
  streamCallId: string;
  candidateId: string;
  interviewerIds: string[];
  result?: "passed" | "failed";
  overallRating?: number;
  comments?: any[];
  candidateEmail?: string;
  candidateName?: string;
}

export default function DashboardPage() {
  const { isLoading: roleLoading, isInterviewer, isCandidate } = useUserRole();
  
  // Use Convex queries
  const users = useQuery(api.users.getUsers);
  const allInterviews = useQuery(api.interviews.getAllInterviews) as Interview[] | undefined;
  const candidateDashboardData = useQuery(api.interviews.getCandidateDashboardData) as Interview[] | undefined;
  const updateStatus = useMutation(api.interviews.updateInterviewStatus);
  
  // Email actions
  const sendResultEmail = useAction(api.emails.sendInterviewResult);
  const sendScheduleEmail = useAction(api.emails.sendInterviewScheduled);

  // Handle status update for interviewer with email notification
  const handleStatusUpdate = async (interviewId: Id<"interviews">, status: string, interview: Interview) => {
    try {
      await updateStatus({ id: interviewId, status });

      // Send result email for passed/failed
      if (status === 'succeeded' || status === 'failed') {
        const candidateInfo = getCandidateInfo(users || [], interview.candidateId);
        const candidateEmail = candidateInfo.email || "priyanmessi007@gmail.com";
        const candidateName = candidateInfo.name || "Test Candidate";
        
        await sendResultEmail({
          candidateEmail: candidateEmail,
          candidateName: candidateName,
          interviewTitle: interview.title,
          result: status === 'succeeded' ? 'passed' : 'failed',
          rating: interview.overallRating || 4,
          feedback: "Thank you for your participation. Detailed feedback is available in your dashboard.",
          interviewerName: "Interview Panel",
        });
        
        toast.success(`Interview marked as ${status} and email sent!`);
      } else {
        toast.success(`Interview marked as ${status}`);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  // Render stars for ratings
  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((starValue) => (
        <StarIcon
          key={starValue}
          className={`h-4 w-4 ${
            starValue <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );

  if (roleLoading) return <LoaderUI />;

  // For candidates - enhanced view with ratings and comments
  if (isCandidate) {
    const interviews = candidateDashboardData || [];
    
    const groupedInterviews = {
      upcoming: interviews.filter(i => i.status === "scheduled" || i.status === "upcoming"),
      completed: interviews.filter(i => i.status === "completed" && !i.result),
      passed: interviews.filter(i => i.result === "passed"),
      failed: interviews.filter(i => i.result === "failed"),
    };

    return (
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Interview Dashboard</h1>
          <p className="text-muted-foreground">
            Track your interview progress and review feedback from interviewers
          </p>
        </div>

        {interviews.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No interviews scheduled</h3>
                <p className="text-muted-foreground">
                  You don't have any interviews scheduled yet. Check back later or contact your recruiter.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Upcoming Interviews */}
            {groupedInterviews.upcoming.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-semibold">Upcoming Interviews</h2>
                  <Badge variant="default">{groupedInterviews.upcoming.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedInterviews.upcoming.map((interview) => (
                    <CandidateInterviewCard key={interview._id} interview={interview} users={users || []} />
                  ))}
                </div>
              </section>
            )}

            {/* Passed Interviews */}
            {groupedInterviews.passed.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-semibold">Passed Interviews</h2>
                  <Badge variant="default">{groupedInterviews.passed.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedInterviews.passed.map((interview) => (
                    <CandidateInterviewCard key={interview._id} interview={interview} users={users || []} />
                  ))}
                </div>
              </section>
            )}

            {/* Failed Interviews */}
            {groupedInterviews.failed.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-semibold">Improvement Areas</h2>
                  <Badge variant="destructive">{groupedInterviews.failed.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedInterviews.failed.map((interview) => (
                    <CandidateInterviewCard key={interview._id} interview={interview} users={users || []} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed (No Result Yet) */}
            {groupedInterviews.completed.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-semibold">Awaiting Results</h2>
                  <Badge variant="secondary">{groupedInterviews.completed.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedInterviews.completed.map((interview) => (
                    <CandidateInterviewCard key={interview._id} interview={interview} users={users || []} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    );
  }

  // For interviewers - full featured dashboard
  if (isInterviewer) {
    if (!allInterviews || !users) return <LoaderUI />;

    const groupedInterviews = groupInterviews(allInterviews);

    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center mb-8">
          <Link href="/schedule">
            <Button>Schedule New Interview</Button>
          </Link>
        </div>

        <div className="space-y-8">
          {INTERVIEW_CATEGORY.map(
            (category) =>
              groupedInterviews[category.id]?.length > 0 && (
                <section key={category.id}>
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-xl font-semibold">{category.title}</h2>
                    <Badge variant={category.variant}>{groupedInterviews[category.id].length}</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedInterviews[category.id].map((interview: Interview) => {
                      const candidateInfo = getCandidateInfo(users, interview.candidateId);
                      const startTime = new Date(interview.startTime);

                      return (
                        <Card key={interview._id} className="hover:shadow-md transition-all">
                          <CardHeader className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={candidateInfo.image} />
                                <AvatarFallback>{candidateInfo.initials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <CardTitle className="text-base">{candidateInfo.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">{interview.title}</p>
                                {interview.result && (
                                  <Badge 
                                    variant={interview.result === "passed" ? "default" : "destructive"}
                                    className="mt-1"
                                  >
                                    {interview.result === "passed" ? "✅ Passed" : "❌ Failed"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="p-4">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-4 w-4" />
                                {format(startTime, "MMM dd")}
                              </div>
                              <div className="flex items-center gap-1">
                                <ClockIcon className="h-4 w-4" />
                                {format(startTime, "hh:mm a")}
                              </div>
                            </div>

                            {interview.overallRating && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-sm text-muted-foreground">Rating:</span>
                                {renderStars(interview.overallRating)}
                                <span className="text-sm text-muted-foreground">
                                  ({interview.overallRating}/5)
                                </span>
                              </div>
                            )}
                          </CardContent>

                          <CardFooter className="p-4 pt-0 flex flex-col gap-3">
                            {interview.status === "completed" && !interview.result && (
                              <div className="flex gap-2 w-full">
                                <Button
                                  className="flex-1"
                                  onClick={() => handleStatusUpdate(interview._id, "succeeded", interview)}
                                >
                                  <CheckCircle2Icon className="h-4 w-4 mr-2" />
                                  Pass
                                </Button>
                                <Button
                                  variant="destructive"
                                  className="flex-1"
                                  onClick={() => handleStatusUpdate(interview._id, "failed", interview)}
                                >
                                  <XCircleIcon className="h-4 w-4 mr-2" />
                                  Fail
                                </Button>
                              </div>
                            )}

                            {interview.result && (
                              <div className="text-center w-full">
                                <p className="text-sm text-muted-foreground">
                                  Result: <strong className="capitalize">{interview.result}</strong>
                                </p>
                              </div>
                            )}
                            
                            <CommentDialog 
                              interviewId={interview._id}
                              candidateEmail={candidateInfo.email}
                              candidateName={candidateInfo.name}
                              interviewTitle={interview.title}
                            />
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              )
          )}
        </div>
      </div>
    );
  }

  return <div>Unauthorized</div>;
}

// Enhanced Candidate Interview Card Component
function CandidateInterviewCard({ interview, users }: { interview: Interview; users: any[] }) {
  const startTime = new Date(interview.startTime);
  const endTime = interview.endTime ? new Date(interview.endTime) : null;

  const getStatusVariant = (status: string, result?: string) => {
    if (result === "passed") return "default";
    if (result === "failed") return "destructive";
    if (status === "completed") return "secondary";
    if (status === "scheduled" || status === "upcoming") return "default";
    return "outline";
  };

  const getStatusText = (status: string, result?: string) => {
    if (result === "passed") return "Passed";
    if (result === "failed") return "Failed";
    if (status === "completed") return "Completed";
    if (status === "scheduled" || status === "upcoming") return "Upcoming";
    return status;
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((starValue) => (
        <StarIcon
          key={starValue}
          className={`h-4 w-4 ${
            starValue <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );

  // Get interviewer information
  const getInterviewerInfo = (interviewerId: string) => {
    const interviewer = users.find(user => user.clerkId === interviewerId);
    return {
      name: interviewer?.name || "Interviewer",
      image: interviewer?.image || "",
    };
  };

  return (
    <Card className="hover:shadow-md transition-all h-full">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg">{interview.title}</CardTitle>
            {interview.description && (
              <p className="text-sm text-muted-foreground">{interview.description}</p>
            )}
          </div>
          <Badge variant={getStatusVariant(interview.status, interview.result)}>
            {getStatusText(interview.status, interview.result)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-4">
        {/* Date & Time */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" />
            {format(startTime, "MMM dd, yyyy")}
          </div>
          <div className="flex items-center gap-1">
            <ClockIcon className="h-4 w-4" />
            {format(startTime, "hh:mm a")}
            {endTime && ` - ${format(endTime, "hh:mm a")}`}
          </div>
        </div>

        {/* Interviewers - FIXED: Safe check for interviewerIds */}
        {interview.interviewerIds && interview.interviewerIds.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm font-medium">
              <UserIcon className="h-4 w-4" />
              Interviewers
            </div>
            <div className="flex flex-wrap gap-2">
              {interview.interviewerIds.map((interviewerId: string) => {
                const interviewerInfo = getInterviewerInfo(interviewerId);
                return (
                  <div key={interviewerId} className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={interviewerInfo.image} />
                      <AvatarFallback className="text-xs">
                        {interviewerInfo.name?.charAt(0) || "I"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{interviewerInfo.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Overall Rating */}
        {interview.overallRating && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Overall Rating</div>
            <div className="flex items-center gap-2">
              {renderStars(interview.overallRating)}
              <span className="text-sm text-muted-foreground">
                ({interview.overallRating}/5)
              </span>
            </div>
          </div>
        )}

        {/* Comments & Feedback */}
        {interview.comments && interview.comments.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Feedback</div>
            <div className="space-y-3">
              {interview.comments.map((comment: any, index: number) => {
                const interviewerInfo = getInterviewerInfo(comment.interviewerId);
                return (
                  <div key={index} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={interviewerInfo.image} />
                          <AvatarFallback className="text-xs">
                            {interviewerInfo.name?.charAt(0) || "I"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{interviewerInfo.name}</span>
                      </div>
                      {renderStars(comment.rating)}
                    </div>
                    <p className="text-sm text-muted-foreground">{comment.content}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Feedback Message */}
        {interview.status === "completed" && (!interview.comments || interview.comments.length === 0) && (
          <div className="text-sm text-muted-foreground italic">
            No feedback provided yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}