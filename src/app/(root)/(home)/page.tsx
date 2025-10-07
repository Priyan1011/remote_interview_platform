"use client";

import ActionCard from "@/components/ActionCard";
import { QUICK_ACTIONS } from "@/constants";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import MeetingModal from "@/components/MeetingModal";
import LoaderUI from "@/components/LoaderUI";
import { Loader2Icon } from "lucide-react";
import MeetingCard from "@/components/MeetingCard";
import { Button } from "@/components/ui/button"; // ADD THIS IMPORT
import Link from "next/link"; // ADD THIS IMPORT
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // ADD THIS IMPORT

export default function Home() {
  const router = useRouter();

  const { isInterviewer, isCandidate, isLoading } = useUserRole();
  const interviews = useQuery(api.interviews.getMyInterviews);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"start" | "join">();

  const handleQuickAction = (title: string) => {
    switch (title) {
      case "New Call":
        setModalType("start");
        setShowModal(true);
        break;
      case "Join Interview":
        setModalType("join");
        setShowModal(true);
        break;
      default:
        router.push(`/${title.toLowerCase()}`);
    }
  };

  if (isLoading) return <LoaderUI />;

  return (
    <div className="container max-w-7xl mx-auto p-6">
      {/* WELCOME SECTION */}
      <div className="rounded-lg bg-card p-6 border shadow-sm mb-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
          Welcome back!
        </h1>
        <p className="text-muted-foreground mt-2">
          {isInterviewer
            ? "Manage your interviews and review candidates effectively"
            : "Access your upcoming interviews and preparations"}
        </p>
        
        {/* ADD DASHBOARD BUTTON FOR CANDIDATES
        {isCandidate && (
          <div className="mt-4">
            <Link href="/dashboard">
              <Button className="bg-blue-600 hover:bg-blue-700">
                View Full Dashboard
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-2">
              Track all your interviews, view results, and see detailed feedback
            </p>
          </div>
        )} */}
      </div>

      {isInterviewer ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {QUICK_ACTIONS.map((action) => (
              <ActionCard
                key={action.title}
                action={action}
                onClick={() => handleQuickAction(action.title)}
              />
            ))}
          </div>

          <MeetingModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title={modalType === "join" ? "Join Meeting" : "Start Meeting"}
            isJoinMeeting={modalType === "join"}
          />
        </>
      ) : (
        <>
          {/* ENHANCED CANDIDATE SECTION WITH DASHBOARD CTA */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">Your Interviews</h1>
              <p className="text-muted-foreground mt-1">
                View and join your scheduled interviews
              </p>
            </div>
            
            {/* DASHBOARD BUTTON FOR CANDIDATES */}
            {/* <Link href="/dashboard">
              <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                View Detailed Dashboard
              </Button>
            </Link> */}
          </div>

          {/* QUICK STATS CARDS FOR CANDIDATES */}
          {interviews && interviews.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {interviews.filter(i => i.status === "scheduled" || i.status === "upcoming").length}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {interviews.filter(i => i.status === "completed").length}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {interviews.filter(i => i.result).length}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* DASHBOARD FEATURES CARD
          <Card className="mb-8 bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">
                    Want to see more details?
                  </h3>
                  <p className="text-blue-700 text-sm mt-1">
                    Access your full dashboard to view interview results, detailed feedback, ratings, and improvement areas.
                  </p>
                </div>
                <Link href="/dashboard">
                  <Button className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card> */}

          {/* INTERVIEWS LIST */}
          <div className="mt-4">
            {interviews === undefined ? (
              <div className="flex justify-center py-12">
                <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : interviews.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {interviews.map((interview) => (
                  <MeetingCard key={interview._id} interview={interview} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">No interviews scheduled</h3>
                    <p className="text-muted-foreground">
                      You don't have any interviews scheduled yet. Check back later or contact your recruiter.
                    </p>
                    <Link href="/dashboard">
                      <Button variant="outline">
                        Check Dashboard
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}