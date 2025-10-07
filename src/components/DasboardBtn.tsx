"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { SparklesIcon } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

function DasboardBtn() {
  const { isCandidate, isInterviewer, isLoading } = useUserRole();

  if (isLoading) return null;

  // Show dashboard button for both candidates and interviewers
  if (!isCandidate && !isInterviewer) return null;

  // Different routes for different user types
  const dashboardRoute = isCandidate ? "/candidate/dashboard" : "/dashboard";
  
  return (
    <Link href={dashboardRoute}>
      <Button>
        <SparklesIcon className="h-4 w-4 mr-2" />
        Dashboard
      </Button>
    </Link>
  );
}

export default DasboardBtn;
