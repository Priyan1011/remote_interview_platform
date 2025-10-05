import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import { MessageSquareIcon, StarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { getInterviewerInfo } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { format } from "date-fns";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";

function CommentDialog({ 
  interviewId, 
  candidateEmail, 
  candidateName, 
  interviewTitle 
}: { 
  interviewId: Id<"interviews">;
  candidateEmail?: string;
  candidateName?: string;
  interviewTitle?: string;
}) {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState("3");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addComment = useMutation(api.comments.addComment);
  const updateInterviewResult = useMutation(api.interviews.updateInterviewResult);
  const sendFeedbackEmail = useAction(api.emails.sendFeedbackAdded);

  const users = useQuery(api.users.getUsers);
  const existingComments = useQuery(api.comments.getComments, { interviewId });

  // Check if current user has already submitted feedback
  const hasUserAlreadyCommented = existingComments?.some(comment => 
    comment.interviewerId === user?.id
  ) || false;

  const handleSubmit = async () => {
    if (!comment.trim()) return toast.error("Please enter comment");

    setIsSubmitting(true);
    
    try {
      const ratingValue = parseInt(rating);
      
      // Update interview result based on rating
      await updateInterviewResult({
        id: interviewId,
        result: ratingValue >= 3 ? "passed" : "failed",
        overallRating: ratingValue,
      });

      // Add comment to database
      await addComment({
        interviewId,
        content: comment.trim(),
        rating: ratingValue,
      });

      // Send email notification to candidate
      const targetEmail = candidateEmail || "priyanmessi007@gmail.com"; // Fallback for testing
      const targetName = candidateName || "Test Candidate";

      try {
        await sendFeedbackEmail({
          candidateEmail: targetEmail,
          candidateName: targetName,
          interviewTitle: interviewTitle || "Interview Session",
          interviewerName: "Interviewer",
          feedback: comment,
        });
        toast.success("Feedback submitted and email sent successfully!");
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        toast.success("Feedback submitted! (Email notification failed)");
      }

      setComment("");
      setRating("3");
      setIsOpen(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((starValue) => (
        <StarIcon
          key={starValue}
          className={`h-4 w-4 ${starValue <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
        />
      ))}
    </div>
  );

  if (existingComments === undefined || users === undefined) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="secondary" 
          className="w-full" 
          disabled={hasUserAlreadyCommented}
        >
          <MessageSquareIcon className="h-4 w-4 mr-2" />
          {hasUserAlreadyCommented ? "Feedback Already Submitted" : "Add Comment & Rating"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Interview Feedback & Rating</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {existingComments.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Previous Feedback</h4>
                <Badge variant="outline">
                  {existingComments.length} Comment{existingComments.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              <ScrollArea className="h-[240px]">
                <div className="space-y-4">
                  {existingComments.map((comment, index) => {
                    const interviewer = getInterviewerInfo(users, comment.interviewerId);
                    const isCurrentUserComment = comment.interviewerId === user?.id;
                    
                    return (
                      <div 
                        key={index} 
                        className={`rounded-lg border p-4 space-y-3 ${
                          isCurrentUserComment ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={interviewer.image} />
                              <AvatarFallback>{interviewer.initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {interviewer.name}
                                {isCurrentUserComment && (
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    Your Feedback
                                  </Badge>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(comment._creationTime, "MMM d, yyyy • h:mm a")}
                              </p>
                            </div>
                          </div>
                          {renderStars(comment.rating)}
                        </div>
                        <p className="text-sm text-muted-foreground">{comment.content}</p>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {!hasUserAlreadyCommented && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Overall Rating</Label>
                <Select value={rating} onValueChange={setRating}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <SelectItem key={value} value={value.toString()}>
                        <div className="flex items-center gap-2">
                          {renderStars(value)}
                          <span className="text-sm">
                            {value} star{value !== 1 ? 's' : ''} 
                            {value >= 3 ? ' ✅' : ' ❌'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Ratings 3+ will mark as Passed, below 3 as Failed
                </p>
              </div>

              <div className="space-y-2">
                <Label>Detailed Feedback</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your detailed feedback about the candidate's performance, technical skills, communication, and areas for improvement..."
                  className="h-32"
                />
              </div>
            </div>
          )}

          {hasUserAlreadyCommented && (
            <div className="text-center py-8">
              <div className="text-green-600 mb-2">
                <MessageSquareIcon className="h-8 w-8 mx-auto" />
              </div>
              <p className="text-sm font-medium text-green-600">
                You have already submitted feedback for this interview.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Your feedback is highlighted above.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          {!hasUserAlreadyCommented && (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CommentDialog;
