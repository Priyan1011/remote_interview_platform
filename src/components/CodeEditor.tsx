import { CODING_QUESTIONS, LANGUAGES } from "@/constants";
import { useState, useEffect, useCallback, useRef } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { AlertCircleIcon, BookIcon, LightbulbIcon, PlayIcon, Loader2, CheckCircleIcon, XCircleIcon } from "lucide-react";
import { Button } from "./ui/button";
import Editor from "@monaco-editor/react";
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { debounce } from 'lodash';

interface CodeEditorProps {
  sessionId: string;
  userId: string;
}

interface ExecutionResult {
  success: boolean;
  output: string;
  error: string;
  status: string;
  time: number;
  memory: number;
}

function CodeEditor({ sessionId, userId }: CodeEditorProps) {
  const [selectedQuestion, setSelectedQuestion] = useState(CODING_QUESTIONS[0]);
  const [language, setLanguage] = useState<"javascript" | "python" | "java">(LANGUAGES[0].id);
  const [code, setCode] = useState(selectedQuestion.starterCode[language]);
  const [editor, setEditor] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const lastUpdatedBy = useRef<string>("");
  const isFirstLoad = useRef(true);

  // Convex queries and mutations
  const codeSession = useQuery(api.codeEditor.getCodeSession, { sessionId });
  const updateCode = useMutation(api.codeEditor.updateCode);
  const updateLanguage = useMutation(api.codeEditor.updateLanguage);
  const updateQuestion = useMutation(api.codeEditor.updateQuestion);
  const storeExecutionResult = useMutation(api.codeExecution.executeCode);

  // Debounced update function for code only
  const debouncedUpdateCode = useCallback(
    debounce((code: string) => {
      lastUpdatedBy.current = userId;
      updateCode({
        sessionId,
        code,
        language,
        questionId: selectedQuestion.id,
        userId,
      });
    }, 500),
    [sessionId, language, selectedQuestion.id, userId, updateCode]
  );

  // Update from server data - simplified
  useEffect(() => {
    if (codeSession) {
      // Only update code, not language or question to avoid revert bug
      if (codeSession.code !== code && editor && codeSession.code.length > 0) {
        setCode(codeSession.code);
        const position = editor.getPosition();
        editor.setValue(codeSession.code);
        if (position) {
          editor.setPosition(position);
        }
      }
    }
  }, [codeSession?.code, editor]);

  // Handle question change
  const handleQuestionChange = (questionId: string) => {
    const question = CODING_QUESTIONS.find((q) => q.id === questionId)!;
    setSelectedQuestion(question);
    const newCode = question.starterCode[language];
    setCode(newCode);
    
    // Update editor
    if (editor) {
      editor.setValue(newCode);
    }

    // Update server
    updateQuestion({
      sessionId,
      questionId,
      code: newCode,
      userId,
    });
  };

  // Handle language change
  const handleLanguageChange = (newLanguage: "javascript" | "python" | "java") => {
    setLanguage(newLanguage);
    const newCode = selectedQuestion.starterCode[newLanguage];
    setCode(newCode);
    
    // Update editor
    if (editor) {
      editor.setValue(newCode);
    }

    // Update server
    updateLanguage({
      sessionId,
      language: newLanguage,
      userId,
    });

    updateCode({
      sessionId,
      code: newCode,
      language: newLanguage,
      questionId: selectedQuestion.id,
      userId,
    });
  };

  // Handle Monaco Editor mount
  const handleEditorDidMount = (editorInstance: any) => {
    setEditor(editorInstance);
    
    // Listen for content changes
    editorInstance.onDidChangeModelContent(() => {
      const content = editorInstance.getValue();
      setCode(content);
      debouncedUpdateCode(content);
    });
  };

  // Handle Run Code
  const handleRunCode = async () => {
    setIsRunning(true);
    setIsModalOpen(true);
    setExecutionResult(null);

    const startTime = Date.now();

    try {
      console.log("Sending code to API:", { code, language, input: customInput });

      // Call the API route directly (no Convex fetch issues)
      const response = await fetch('/api/execute-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          input: customInput,
        }),
      });

      if (!response.ok) {
        throw new Error(`Execution failed: ${response.statusText}`);
      }

      const apiResult = await response.json();
      console.log("API Response:", apiResult);
      
      const executionTime = Date.now() - startTime;

      const result = {
        ...apiResult,
        time: executionTime
      };

      console.log("Final result to display:", result);
      setExecutionResult(result);

      // Store the execution result in Convex database
      await storeExecutionResult({
        sessionId,
        userId,
        code,
        language,
        input: customInput,
        output: result.output,
        error: result.error,
        status: result.status,
        executionTime: result.time,
        memory: result.memory,
      });

    } catch (error: any) {
      console.error("Execution error:", error);
      const errorResult = {
        success: false,
        output: "",
        error: `Failed to execute code: ${error.message}`,
        status: "Error",
        time: Date.now() - startTime,
        memory: 0
      };
      
      setExecutionResult(errorResult);

      // Store error in Convex
      await storeExecutionResult({
        sessionId,
        userId,
        code,
        language,
        input: customInput,
        output: errorResult.output,
        error: errorResult.error,
        status: errorResult.status,
        executionTime: errorResult.time,
        memory: errorResult.memory,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status.toLowerCase().includes("accepted") || status.toLowerCase().includes("finished")) {
      return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
    } else if (status.toLowerCase().includes("error") || status.toLowerCase().includes("failed")) {
      return <XCircleIcon className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  return (
    <ResizablePanelGroup direction="vertical" className="min-h-[calc(100vh-4rem-1px)]">
      {/* QUESTION SECTION */}
      <ResizablePanel>
        <ScrollArea className="h-full">
          <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {selectedQuestion.title}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Choose your language and solve the problem
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={selectedQuestion.id} onValueChange={handleQuestionChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select question" />
                    </SelectTrigger>
                    <SelectContent>
                      {CODING_QUESTIONS.map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <img
                            src={`/${language}.png`}
                            alt={language}
                            className="w-5 h-5 object-contain"
                          />
                          {LANGUAGES.find((l) => l.id === language)?.name}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.id} value={lang.id}>
                          <div className="flex items-center gap-2">
                            <img
                              src={`/${lang.id}.png`}
                              alt={lang.name}
                              className="w-5 h-5 object-contain"
                            />
                            {lang.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* PROBLEM DESC. */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                  <BookIcon className="h-5 w-5 text-primary/80" />
                  <CardTitle>Problem Description</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-line">{selectedQuestion.description}</p>
                  </div>
                </CardContent>
              </Card>

              {/* PROBLEM EXAMPLES */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                  <LightbulbIcon className="h-5 w-5 text-yellow-500" />
                  <CardTitle>Examples</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-full w-full rounded-md border">
                    <div className="p-4 space-y-4">
                      {selectedQuestion.examples.map((example, index) => (
                        <div key={index} className="space-y-2">
                          <p className="font-medium text-sm">Example {index + 1}:</p>
                          <ScrollArea className="h-full w-full rounded-md">
                            <pre className="bg-muted/50 p-3 rounded-lg text-sm font-mono">
                              <div>Input: {example.input}</div>
                              <div>Output: {example.output}</div>
                              {example.explanation && (
                                <div className="pt-2 text-muted-foreground">
                                  Explanation: {example.explanation}
                                </div>
                              )}
                            </pre>
                            <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        </div>
                      ))}
                    </div>
                    <ScrollBar />
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* CONSTRAINTS */}
              {selectedQuestion.constraints && (
                <Card>
                  <CardHeader className="flex flex-row items-center gap-2">
                    <AlertCircleIcon className="h-5 w-5 text-blue-500" />
                    <CardTitle>Constraints</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1.5 text-sm marker:text-muted-foreground">
                      {selectedQuestion.constraints.map((constraint, index) => (
                        <li key={index} className="text-muted-foreground">
                          {constraint}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          <ScrollBar />
        </ScrollArea>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* CODE EDITOR WITH RUN BUTTON */}
      <ResizablePanel defaultSize={60} maxSize={100}>
        <div className="h-full relative">
          {/* Run Button */}
          <div className="absolute top-4 right-4 z-10">
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={handleRunCode} 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlayIcon className="h-4 w-4" />
                  )}
                  {isRunning ? "Running..." : "Run Code"}
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <PlayIcon className="h-5 w-5" />
                    Code Execution Output
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Input Section */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Custom Input (optional)</label>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      className="w-full p-3 border rounded-md font-mono text-sm resize-none"
                      rows={3}
                      placeholder="Enter input for your program..."
                    />
                  </div>

                  {/* Output Section */}
                  <div className="space-y-3">
                    {isRunning ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin mr-3" />
                        <span>Executing your code...</span>
                      </div>
                    ) : executionResult ? (
                      <>
                        {/* Status */}
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                          {getStatusIcon(executionResult.status)}
                          <span className="font-medium">Status: {executionResult.status}</span>
                          {executionResult.time > 0 && (
                            <span className="text-sm text-muted-foreground ml-4">
                              Time: {executionResult.time}ms
                            </span>
                          )}
                          {executionResult.memory > 0 && (
                            <span className="text-sm text-muted-foreground ml-2">
                              Memory: {executionResult.memory} KB
                            </span>
                          )}
                        </div>

                        {/* Output */}
                        {executionResult.output && executionResult.output.trim() && (
                          <div>
                            <h4 className="font-medium mb-2 text-green-600">Output:</h4>
                            <div className="bg-green-50 border border-green-200 rounded-md p-4 overflow-auto max-h-60">
                              <pre className="font-mono text-sm whitespace-pre-wrap break-words text-green-800">
                                {executionResult.output}
                              </pre>
                            </div>
                          </div>
                        )}

                        {/* Errors */}
                        {executionResult.error && executionResult.error.trim() && (
                          <div>
                            <h4 className="font-medium mb-2 text-red-600">Error:</h4>
                            <div className="bg-red-50 border border-red-200 rounded-md p-4 overflow-auto max-h-60">
                              <pre className="font-mono text-sm whitespace-pre-wrap break-words text-red-800">
                                {executionResult.error}
                              </pre>
                            </div>
                          </div>
                        )}

                        {/* No Output */}
                        {(!executionResult.output || !executionResult.output.trim()) && 
                         (!executionResult.error || !executionResult.error.trim()) && (
                          <div className="p-4 bg-gray-50 rounded-md text-center text-gray-600 border">
                            No output generated
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-md text-center text-gray-600 border">
                        Click "Run Code" to execute your program
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Monaco Editor */}
          <Editor
            height={"100%"}
            defaultLanguage={language}
            language={language}
            theme="vs-dark"
            value={code}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: 18,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 16, bottom: 16, right: 120 },
              wordWrap: "on",
              wrappingIndent: "indent",
            }}
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export default CodeEditor;