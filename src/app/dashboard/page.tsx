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
import { CalendarIcon, CheckCircle2Icon, ClockIcon, XCircleIcon, MessageSquareIcon, StarIcon } from "lucide-react";
import { format } from "date-fns";
import CommentDialog from "@/components/CommentDialog";

// Define interview categories
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
  const myInterviews = useQuery(api.interviews.getMyInterviews) as Interview[] | undefined;
  const candidateDashboardData = useQuery(api.interviews.getCandidateDashboardData) as Interview[] | undefined;
  const updateStatus = useMutation(api.interviews.updateInterviewStatus);
// Add these after your existing useMutation/useQuery declarations
const sendResultEmail = useAction(api.emails.sendInterviewResult);
const sendScheduleEmail = useAction(api.emails.sendInterviewScheduled);

  // Handle status update for interviewer with email notification
 const handleStatusUpdate = async (interviewId: Id<"interviews">, status: string, interview: Interview) => {
  try {
    await updateStatus({ id: interviewId, status });

    // ✅ SEND RESULT EMAIL FOR PASSED/FAILED
    if (status === 'succeeded' || status === 'failed') {
      // Get candidate info
      const candidateInfo = getCandidateInfo(users || [], interview.candidateId);
      
      // Use candidate info from users query
      const candidateEmail = candidateInfo.email || "priyanmessi007@gmail.com";
      const candidateName = candidateInfo.name || "Test Candidate";
      
      await sendResultEmail({
        candidateEmail: candidateEmail,
        candidateName: candidateName,
        interviewTitle: interview.title,
        result: status === 'succeeded' ? 'passed' : 'failed',
        rating: interview.overallRating || 4, // Use actual rating or default
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
    const interviews = candidateDashboardData || myInterviews || [];
    
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
                    <InterviewCard key={interview._id} interview={interview} type="candidate" />
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
                    <InterviewCard key={interview._id} interview={interview} type="candidate" />
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
                    <InterviewCard key={interview._id} interview={interview} type="candidate" />
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
                    <InterviewCard key={interview._id} interview={interview} type="candidate" />
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
                  {/* CATEGORY TITLE */}
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
                          {/* CANDIDATE INFO */}
                          <CardHeader className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={candidateInfo.image} />
                                <AvatarFallback>{candidateInfo.initials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <CardTitle className="text-base">{candidateInfo.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">{interview.title}</p>
                                
                                {/* Show result badge if available */}
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

                          {/* DATE & TIME */}
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

                            {/* Show rating if available */}
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

                          {/* PASS & FAIL BUTTONS */}
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

                            {/* Show result message if already set */}
                            {interview.result && (
                              <div className="text-center w-full">
                                <p className="text-sm text-muted-foreground">
                                  Result: <strong className="capitalize">{interview.result}</strong>
                                </p>
                              </div>
                            )}
                            
                            {/* UPDATED: Pass candidate info to CommentDialog */}
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

// Interview Card Component for Candidate Dashboard
function InterviewCard({ interview, type }: { interview: Interview; type: "candidate" }) {
  const startTime = new Date(interview.startTime);
  const endTime = interview.endTime ? new Date(interview.endTime) : null;

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((starValue) => (
        <span
          key={starValue}
          className={`text-sm ${
            starValue <= rating ? "text-yellow-400" : "text-gray-300"
          }`}
        >
          ★
        </span>
      ))}
    </div>
  );

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{interview.title}</CardTitle>
            {interview.description && (
              <p className="text-sm text-muted-foreground mt-1">{interview.description}</p>
            )}
          </div>
          <Badge 
            variant={
              interview.result === "passed" ? "default" : 
              interview.result === "failed" ? "destructive" :
              interview.status === "completed" ? "secondary" : "default"
            }
          >
            {interview.result === "passed" ? "Passed" : 
             interview.result === "failed" ? "Failed" : 
             interview.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3">
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
            <div className="text-sm font-medium">Interviewer Feedback</div>
            <div className="space-y-3">
              {interview.comments.map((comment: any, index: number) => (
                <div key={index} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">I</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">Interviewer</span>
                    </div>
                    {renderStars(comment.rating)}
                  </div>
                  <p className="text-sm text-muted-foreground">{comment.content}</p>
                </div>
              ))}
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

      <CardFooter className="p-4 pt-0">
        <Button variant="outline" className="w-full" disabled>
          <MessageSquareIcon className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
// Add these test buttons temporarily
<div className="mb-8 p-4 border rounded-lg bg-blue-50">
  <h3 className="text-lg font-semibold mb-2">Test Email Notifications</h3>
  <div className="flex gap-2">
    <Button 
      onClick={async () => {
        // Add these after your existing useMutation/useQuery declarations
const sendResultEmail = useAction(api.emails.sendInterviewResult);
const sendScheduleEmail = useAction(api.emails.sendInterviewScheduled);

        try {
          await sendResultEmail({
            candidateEmail: "priyanmessi007@gmail.com",
            candidateName: "Test Candidate",
            interviewTitle: "Backend Developer Position",
            result: "passed",
            rating: 4,
            feedback: "Excellent technical skills and good communication.",
            interviewerName: "Technical Panel",
          });
          toast.success("Test result email sent!");
        } catch (error) {
          toast.error("Failed to send test email");
        }
      }}
    >
      Test Result Email
    </Button>
    
    <Button 
      variant="secondary"
      onClick={async () => {
        // Declare sendScheduleEmail before using it
        const sendScheduleEmail = useAction(api.emails.sendInterviewScheduled);
        try {
          await sendScheduleEmail({
            candidateEmail: "priyanmessi007@gmail.com",
            candidateName: "Test Candidate",
            interviewTitle: "Frontend Developer Interview",
            interviewDate: "October 25, 2024",
            interviewTime: "2:00 PM",
            interviewerName: "Sarah Wilson",
            meetingLink: "https://meet.google.com/abc-xyz-123",
          });
          toast.success("Test schedule email sent!");
        } catch (error) {
          toast.error("Failed to send test email");
        }
      }}
    >
      Test Schedule Email
    </Button>
  </div>
</div>