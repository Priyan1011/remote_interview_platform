import { v } from "convex/values";
import { action } from "./_generated/server";
import { Resend } from 'resend';

// Get API key from environment
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// For testing - set to false for production
const TEST_MODE = false;
const TEST_EMAIL = "priyanmessi007@gmail.com";

// Feedback email action with Pass/Fail result
export const sendFeedbackAdded = action({
  args: {
    candidateEmail: v.string(),
    candidateName: v.string(),
    interviewTitle: v.string(),
    interviewerName: v.string(),
    feedback: v.string(),
    result: v.union(v.literal("passed"), v.literal("failed")), // ADD RESULT HERE
  },
  handler: async (ctx, args) => {
    // Use actual candidate info in production, test email in development
    const targetEmail = TEST_MODE ? TEST_EMAIL : args.candidateEmail;
    const targetName = TEST_MODE ? "Alice" : args.candidateName; // CHANGED FROM "Test Candidate"
    const resultColor = args.result === 'passed' ? '#10B981' : '#EF4444';
    
    // Check if Resend is configured
    if (!resend) {
      console.warn('Resend API key not configured. Email would have been sent to:', targetEmail);
      return { success: true, skipped: true, reason: 'RESEND_API_KEY not configured' };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: 'InterLink Interviews <onboarding@resend.dev>',
        to: [targetEmail],
        subject: `💬 Interview Feedback: ${args.interviewTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .feedback-box { background: white; padding: 25px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #8B5CF6; font-style: italic; }
              .result-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; text-align: center; border: 2px solid ${resultColor}; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>💬 Interview Feedback & Result</h1>
                <p>Your interviewer has shared feedback and results</p>
              </div>
              <div class="content">
                <p>Hi <strong>${targetName}</strong>,</p>
                <p><strong>${args.interviewerName}</strong> has completed the evaluation for your interview: <strong>${args.interviewTitle}</strong></p>
                
                <!-- RESULT SECTION -->
                <div class="result-box">
                  <h2 style="color: ${resultColor}; margin: 0 0 10px 0;">
                    ${args.result === 'passed' ? '🎉 PASSED' : '❌ NOT PASSED'}
                  </h2>
                  <p><strong>Reviewed by:</strong> ${args.interviewerName}</p>
                </div>

                <!-- FEEDBACK SECTION -->
                <div class="feedback-box">
                  <h3>💬 Feedback from Interviewer</h3>
                  <p>"${args.feedback}"</p>
                </div>

                ${args.result === 'passed' ? `
                <p>🎉 <strong>Congratulations!</strong> Our team will contact you shortly regarding the next steps in the process.</p>
                ` : `
                <p>Thank you for your time and effort. We encourage you to continue developing your skills and apply for future opportunities that match your experience.</p>
                `}

                <p>This feedback is meant to help you improve and grow in your career journey.</p>
                
                <p>Best regards,<br><strong>The InterLink Team</strong></p>
              </div>
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error('Error sending feedback email:', error);
        return { success: false, error };
      }

      console.log(`Feedback email sent successfully to: ${targetEmail} ${TEST_MODE ? '(TEST MODE)' : ''}`);
      return { success: true, data };
    } catch (error) {
      console.error('Failed to send feedback email:', error);
      return { success: false, error };
    }
  },
});

// Interview result email action (keep as is)
export const sendInterviewResult = action({
  args: {
    candidateEmail: v.string(),
    candidateName: v.string(),
    interviewTitle: v.string(),
    result: v.union(v.literal("passed"), v.literal("failed")),
    rating: v.number(),
    feedback: v.optional(v.string()),
    interviewerName: v.string(),
  },
  handler: async (ctx, args) => {
    // Use test email in development
    const targetEmail = TEST_MODE ? TEST_EMAIL : args.candidateEmail;
    const targetName = TEST_MODE ? "Alice" : args.candidateName;
    const resultColor = args.result === 'passed' ? '#10B981' : '#EF4444';
    
    // Check if Resend is configured
    if (!resend) {
      console.warn('Resend API key not configured. Result email would have been sent to:', targetEmail);
      return { success: true, skipped: true, reason: 'RESEND_API_KEY not configured' };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: 'InterLink Interviews <onboarding@resend.dev>',
        to: [targetEmail],
        subject: `📊 Interview Result: ${args.interviewTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, ${resultColor} 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .result-box { background: white; padding: 25px; margin: 20px 0; border-radius: 8px; text-align: center; border: 2px solid ${resultColor}; }
              .rating { color: #F59E0B; font-size: 18px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${args.result === 'passed' ? '🎉 Congratulations!' : '📊 Interview Result'}</h1>
                <p>Your interview result is available</p>
              </div>
              <div class="content">
                <p>Hi <strong>${targetName}</strong>,</p>
                <p>Your interview result for <strong>${args.interviewTitle}</strong> has been reviewed.</p>
                
                <div class="result-box">
                  <h2 style="color: ${resultColor}; margin: 0 0 10px 0;">
                    ${args.result === 'passed' ? '✅ PASSED' : '❌ NOT PASSED'}
                  </h2>
                  <div class="rating">
                    ${'⭐'.repeat(args.rating)}${'☆'.repeat(5 - args.rating)}
                    <span style="color: #666; margin-left: 10px;">(${args.rating}/5)</span>
                  </div>
                  <p><strong>Reviewed by:</strong> ${args.interviewerName}</p>
                </div>

                ${args.feedback ? `
                <div style="background: white; padding: 20px; margin: 15px 0; border-radius: 8px;">
                  <h3>💬 Feedback from Interviewer</h3>
                  <p><em>"${args.feedback}"</em></p>
                </div>
                ` : ''}

                ${args.result === 'passed' ? `
                <p>Congratulations on your achievement! Our team will contact you shortly regarding the next steps.</p>
                ` : `
                <p>Thank you for your time and effort. We encourage you to apply for future opportunities that match your skills.</p>
                `}

                <p>Best regards,<br><strong>The InterLink Team</strong></p>
              </div>
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error('Error sending result email:', error);
        return { success: false, error };
      }

      console.log(`Result email sent successfully to: ${targetEmail} ${TEST_MODE ? '(TEST MODE)' : ''}`);
      return { success: true, data };
    } catch (error) {
      console.error('Failed to send result email:', error);
      return { success: false, error };
    }
  },
});

// Interview scheduled email action
export const sendInterviewScheduled = action({
  args: {
    candidateEmail: v.string(),
    candidateName: v.string(),
    interviewTitle: v.string(),
    interviewDate: v.string(),
    interviewTime: v.string(),
    interviewerName: v.string(),
    meetingLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Use test email in development
    const targetEmail = TEST_MODE ? TEST_EMAIL : args.candidateEmail;
    const targetName = TEST_MODE ? "Alice" : args.candidateName;
    
    // Check if Resend is configured
    if (!resend) {
      console.warn('Resend API key not configured. Schedule email would have been sent to:', targetEmail);
      return { success: true, skipped: true, reason: 'RESEND_API_KEY not configured' };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: 'InterLink Interviews <onboarding@resend.dev>',
        to: [targetEmail],
        subject: `🎯 Interview Scheduled: ${args.interviewTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .detail-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎯 Interview Scheduled</h1>
                <p>Your interview has been confirmed!</p>
              </div>
              <div class="content">
                <p>Hi <strong>${targetName}</strong>,</p>
                <p>Great news! Your interview has been scheduled. Here are the details:</p>
                
                <div class="detail-box">
                  <h3>📅 Interview Details</h3>
                  <p><strong>Position:</strong> ${args.interviewTitle}</p>
                  <p><strong>Date:</strong> ${args.interviewDate}</p>
                  <p><strong>Time:</strong> ${args.interviewTime}</p>
                  <p><strong>Interviewer:</strong> ${args.interviewerName}</p>
                  ${args.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${args.meetingLink}">Join Meeting</a></p>` : ''}
                </div>

                <p>Please make sure to:</p>
                <ul>
                  <li>Join 5 minutes early</li>
                  <li>Have a stable internet connection</li>
                  <li>Keep your resume handy</li>
                  <li>Prepare any required documents</li>
                </ul>

                <p>Best of luck! 🚀</p>
                <p><strong>The InterLink Team</strong></p>
              </div>
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error('Error sending schedule email:', error);
        return { success: false, error };
      }

      console.log(`Schedule email sent successfully to: ${targetEmail} ${TEST_MODE ? '(TEST MODE)' : ''}`);
      return { success: true, data };
    } catch (error) {
      console.error('Failed to send schedule email:', error);
      return { success: false, error };
    }
  },
});
