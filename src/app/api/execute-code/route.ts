// src/app/api/execute-code/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code, language, input = '' } = await request.json();

    // Language mappings for Piston API
    const LANGUAGE_MAPPINGS: Record<string, { language: string; version: string }> = {
      javascript: { language: "javascript", version: "18.15.0" },
      python: { language: "python", version: "3.10.0" },
      java: { language: "java", version: "15.0.2" },
    };

    const langConfig = LANGUAGE_MAPPINGS[language];
    
    if (!langConfig) {
      return NextResponse.json({
        success: false,
        output: "",
        error: `Unsupported language: ${language}`,
        status: "Error",
        memory: 0
      });
    }

    console.log(`Executing ${language} code via Piston API...`);

    // Use Piston API
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
    console.log("Piston API response:", JSON.stringify(data, null, 2));

    // Handle different response structures from Piston API
    let output = "";
    let error = "";
    let success = false;
    let status = "Unknown";
    let memory = 0;

    if (data.run) {
      output = data.run.stdout || data.run.output || "";
      error = data.run.stderr || "";
      success = !error && data.run.code === 0;
      status = data.run.code === 0 ? "Finished" : "Runtime Error";
      memory = data.run.memory || 0;
    } else if (data.message) {
      // API returned an error message
      error = data.message;
      status = "API Error";
    } else {
      // Unexpected response format
      error = "Unexpected response format from execution service";
      status = "Error";
    }

    // If there's compile error, use that
    if (data.compile && data.compile.stderr) {
      error = data.compile.stderr;
      status = "Compilation Error";
    }

    return NextResponse.json({
      success,
      output,
      error,
      status,
      memory,
    });

  } catch (error: any) {
    console.error("Code execution error:", error);
    return NextResponse.json({
      success: false,
      output: "",
      error: error.message || "Failed to execute code",
      status: "Error",
      memory: 0
    });
  }
}

function getFileName(language: string): string {
  const extensions: Record<string, string> = {
    javascript: "script.js",
    python: "script.py", 
    java: "Main.java",
  };
  return extensions[language] || "script.txt";
}