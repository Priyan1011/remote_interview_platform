"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import LoaderUI from "@/components/LoaderUI";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarIcon, ClockIcon, StarIcon, UserIcon } from "lucide-react";
import { format } from "date-fns";

function CandidateDashboardPage() {
  const dashboardData = useQuery(api.interviews.getCandidateDashboardData);

  if (dashboardData === undefined) return <LoaderUI />;

  const groupedInterviews = {
    upcoming: dashboardData.filter(i => i.status === "scheduled" || i.status === "upcoming"),
    completed: dashboardData.filter(i => i.status === "completed" && !i.result),
    passed: dashboardData.filter(i => i.result === "passed"),
    failed: dashboardData.filter(i => i.result === "failed"),
  };

  // FIXED: Use only valid badge variants
  const getStatusVariant = (status: string, result?: string) => {
    if (result === "passed") return "default"; // CHANGED: "success" → "default"
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

  const InterviewCard = ({ interview }: { interview: any }) => {
    const startTime = new Date(interview.startTime);
    const endTime = interview.endTime ? new Date(interview.endTime) : null;

    return (
      <Card className="hover:shadow-md transition-all">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-lg">{interview.title}</CardTitle>
              {interview.description && (
                <CardDescription>{interview.description}</CardDescription>
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

          {/* Interviewers */}
          {interview.interviewers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium">
                <UserIcon className="h-4 w-4" />
                Interviewers
              </div>
              <div className="flex flex-wrap gap-2">
                {interview.interviewers.map((interviewer: any) => (
                  <div key={interviewer.clerkId} className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={interviewer.image} />
                      <AvatarFallback className="text-xs">
                        {interviewer.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{interviewer.name}</span>
                  </div>
                ))}
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
          {interview.comments.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Feedback</div>
              <div className="space-y-3">
                {interview.comments.map((comment: any, index: number) => {
                  const interviewer = interview.interviewers.find(
                    (i: any) => i.clerkId === comment.interviewerId
                  );
                  return (
                    <div key={index} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={interviewer?.image} />
                            <AvatarFallback className="text-xs">
                              {interviewer?.name?.charAt(0) || "I"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{interviewer?.name || "Interviewer"}</span>
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
          {interview.status === "completed" && interview.comments.length === 0 && (
            <div className="text-sm text-muted-foreground italic">
              No feedback provided yet
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Interview Dashboard</h1>
        <p className="text-muted-foreground">
          Track your interview progress and review feedback from interviewers
        </p>
      </div>

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
                <InterviewCard key={interview._id} interview={interview} />
              ))}
            </div>
          </section>
        )}

        {/* Passed Interviews */}
        {groupedInterviews.passed.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold">Passed Interviews</h2>
              <Badge variant="default">{groupedInterviews.passed.length}</Badge> {/* CHANGED: "success" → "default" */}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedInterviews.passed.map((interview) => (
                <InterviewCard key={interview._id} interview={interview} />
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
                <InterviewCard key={interview._id} interview={interview} />
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
                <InterviewCard key={interview._id} interview={interview} />
              ))}
            </div>
          </section>
        )}

        {/* No Interviews */}
        {dashboardData.length === 0 && (
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
        )}
      </div>
    </div>
  );
}

export default CandidateDashboardPage;