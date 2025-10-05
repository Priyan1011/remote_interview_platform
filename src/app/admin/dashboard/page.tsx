"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import toast from "react-hot-toast";
import LoaderUI from "@/components/LoaderUI";
import { getCandidateInfo, groupInterviews } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { INTERVIEW_CATEGORY } from "@/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarIcon, CheckCircle2Icon, ClockIcon, XCircleIcon } from "lucide-react";
import { format } from "date-fns";
import CommentDialog from "@/components/CommentDialog";

type Interview = Doc<"interviews">;

function DashboardPage() {
  const users = useQuery(api.users.getUsers);
  const interviews = useQuery(api.interviews.getAllInterviews); // This should work now
  const updateStatus = useMutation(api.interviews.updateInterviewStatusWithResult); // CHANGED: Use the new mutation

  // UPDATED: This function now handles both status and result updates
  const handleStatusUpdate = async (
    interviewId: Id<"interviews">, 
    status: string, 
    result?: "passed" | "failed"
  ) => {
    try {
      await updateStatus({ 
        id: interviewId, 
        status,
        result,
        overallRating: result === "passed" ? 4 : 2,
      });
      toast.success(`Interview marked as ${result || status}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (!interviews || !users) return <LoaderUI />;

  const groupedInterviews = groupInterviews(interviews);

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
                              
                              {/* NEW: Display result if available */}
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

                          {/* NEW: Display overall rating if available */}
                          {interview.overallRating && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-sm text-muted-foreground">Rating:</span>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <span
                                    key={i}
                                    className={`text-sm ${
                                      i < interview.overallRating!
                                        ? "text-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                ({interview.overallRating}/5)
                              </span>
                            </div>
                          )}
                        </CardContent>

                        {/* PASS & FAIL BUTTONS */}
                        <CardFooter className="p-4 pt-0 flex flex-col gap-3">
                          {/* UPDATED: Only show Pass/Fail buttons for completed interviews without result */}
                          {interview.status === "completed" && !interview.result && (
                            <div className="flex gap-2 w-full">
                              <Button
                                className="flex-1"
                                onClick={() => handleStatusUpdate(interview._id, "completed", "passed")}
                              >
                                <CheckCircle2Icon className="h-4 w-4 mr-2" />
                                Pass
                              </Button>
                              <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={() => handleStatusUpdate(interview._id, "completed", "failed")}
                              >
                                <XCircleIcon className="h-4 w-4 mr-2" />
                                Fail
                              </Button>
                            </div>
                          )}

                          {/* UPDATED: Show different message if result is already set */}
                          {interview.result && (
                            <div className="text-center w-full">
                              <p className="text-sm text-muted-foreground">
                                Result: <strong className="capitalize">{interview.result}</strong>
                              </p>
                            </div>
                          )}

                          {/* Comment Dialog - Always show for feedback */}
                          <CommentDialog interviewId={interview._id} />
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

export default DashboardPage;