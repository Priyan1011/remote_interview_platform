// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import { api } from "./_generated/api";

const http = httpRouter();

// Your existing Clerk webhook route
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("Missing CLERK_WEBHOOK_SECRET environment variable");
    }

    const svix_id = request.headers.get("svix-id");
    const svix_signature = request.headers.get("svix-signature");
    const svix_timestamp = request.headers.get("svix-timestamp");

    if (!svix_id || !svix_signature || !svix_timestamp) {
      return new Response("No svix headers found", {
        status: 400,
      });
    }

    const payload = await request.json();
    const body = JSON.stringify(payload);

    const wh = new Webhook(webhookSecret);
    let evt: WebhookEvent;

    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return new Response("Error occurred", { status: 400 });
    }

    const eventType = evt.type;

    if (eventType === "user.created") {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;

      const email = email_addresses[0].email_address;
      const name = `${first_name || ""} ${last_name || ""}`.trim();

      try {
        await ctx.runMutation(api.users.syncUser, {
          clerkId: id,
          email,
          name,
          image: image_url,
        });
      } catch (error) {
        console.log("Error creating user:", error);
        return new Response("Error creating user", { status: 500 });
      }
    }

    return new Response("Webhook processed successfully", { status: 200 });
  }),
});

// ADD THIS NEW ROUTE FOR CODE EXECUTION
http.route({
  path: "/executeCode",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { code, language, input = '' } = await request.json();

    // Language mappings for Piston API
    const LANGUAGE_MAPPINGS: Record<string, { language: string; version: string }> = {
      javascript: { language: "javascript", version: "18.15.0" },
      python: { language: "python", version: "3.10.0" },
      java: { language: "java", version: "15.0.2" },
    };

    const langConfig = LANGUAGE_MAPPINGS[language];
    
    if (!langConfig) {
      return new Response(
        JSON.stringify({
          success: false,
          output: "",
          error: `Unsupported language: ${language}`,
          status: "Error",
          memory: 0
        }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    try {
      // Use Piston API - HTTP Actions allow fetch()
      const response = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: langConfig.language,
          version: langConfig.version,
          files: [
            {
              name: getFileName(language),
              content: code,
            },
          ],
          stdin: input,
          args: [],
          compile_timeout: 10000,
          run_timeout: 10000,
          compile_memory_limit: -1,
          run_memory_limit: -1,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();

      const result = {
        success: !data.run.stderr && data.run.code === 0,
        output: data.run.stdout || data.run.output || "",
        error: data.run.stderr || data.compile.stderr || "",
        status: data.run.code === 0 ? "Finished" : "Runtime Error",
        memory: data.run.memory || 0,
      };

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    } catch (error: any) {
      const result = {
        success: false,
        output: "",
        error: error.message || "Failed to execute code",
        status: "Error",
        memory: 0
      };

      return new Response(JSON.stringify(result), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

function getFileName(language: string): string {
  const extensions: Record<string, string> = {
    javascript: "script.js",
    python: "script.py", 
    java: "Main.java",
  };
  return extensions[language] || "script.txt";
}

export default http;