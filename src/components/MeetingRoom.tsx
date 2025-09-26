import {
  CallControls,
  CallingState,
  CallParticipantsList,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { LayoutListIcon, LoaderIcon, UsersIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation"; // Add useSearchParams
import { useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import EndCallButton from "./EndCallButton";
import CodeEditor from "./CodeEditor";
import { useUser } from "@clerk/nextjs"; // Add this import

function MeetingRoom() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Add this to get meeting ID
  const { user } = useUser(); // Add this to get current user
  const [layout, setLayout] = useState<"grid" | "speaker">("speaker");
  const [showParticipants, setShowParticipants] = useState(false);
  
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  // Get meeting ID from URL parameters
  const meetingId = searchParams.get('id') || 'default-session';

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="flex-center h-screen w-full">
        <LoaderIcon className="animate-spin" />
      </div>
    );
  }

  return (
    <section className="relative h-screen w-full overflow-hidden pt-4 text-white">
      {/* Make this a ResizablePanelGroup to split video and code editor */}
      <ResizablePanelGroup direction="horizontal" className="h-full">
        
        {/* VIDEO PANEL */}
        <ResizablePanel defaultSize={60} minSize={40}>
          <div className="relative flex size-full flex-col">
            {/* VIDEO LAYOUT */}
            <div className="relative flex-1">
              {layout === "grid" ? <PaginatedGridLayout /> : <SpeakerLayout />}
              
              {/* PARTICIPANTS LIST OVERLAY */}
              {showParticipants && (
                <div className="absolute inset-0 z-20">
                  <CallParticipantsList onClose={() => setShowParticipants(false)} />
                </div>
              )}
            </div>

            {/* VIDEO CONTROLS */}
            <div className="flex-center relative gap-5">
              <CallControls onLeave={() => router.push("/")} />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <LayoutListIcon size={20} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setLayout("grid")}>
                    Grid View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLayout("speaker")}>
                    Speaker View
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowParticipants((prev) => !prev)}
              >
                <UsersIcon size={20} />
              </Button>

              <EndCallButton />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* CODE EDITOR PANEL */}
        <ResizablePanel defaultSize={40} minSize={30}>
          <CodeEditor 
            sessionId={meetingId}
            userId={user?.id || 'anonymous'}
          />
        </ResizablePanel>

      </ResizablePanelGroup>
    </section>
  );
}

export default MeetingRoom;

