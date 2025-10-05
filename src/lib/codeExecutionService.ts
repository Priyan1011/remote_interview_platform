// src/lib/codeExecutionService.ts
interface ExecuteCodeParams {
  code: string;
  language: string;
  input?: string;
}

interface ExecuteCodeResult {
  success: boolean;
  output: string;
  error: string;
  status: string;
  memory: number;
}

// Language mappings for Piston API
const LANGUAGE_MAPPINGS: Record<string, { language: string; version: string }> = {
  javascript: { language: "javascript", version: "18.15.0" },
  python: { language: "python", version: "3.10.0" },
  java: { language: "java", version: "15.0.2" },
};

export async function executeCode({ code, language, input = "" }: ExecuteCodeParams): Promise<ExecuteCodeResult> {
  try {
    const langConfig = LANGUAGE_MAPPINGS[language];
    
    if (!langConfig) {
      return {
        success: false,
        output: "",
        error: `Unsupported language: ${language}`,
        status: "Error",
        memory: 0
      };
    }

    console.log(`Executing ${language} code via Piston API...`);

    // Use Piston API (free public instance)
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
    console.log("Piston API response:", data);

    return {
      success: !data.run.stderr && data.run.code === 0,
      output: data.run.stdout || data.run.output || "",
      error: data.run.stderr || data.compile.stderr || "",
      status: data.run.code === 0 ? "Finished" : "Runtime Error",
      memory: data.run.memory || 0,
    };

  } catch (error: any) {
    console.error("Code execution error:", error);
    return {
      success: false,
      output: "",
      error: error.message || "Failed to execute code",
      status: "Error",
      memory: 0
    };
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