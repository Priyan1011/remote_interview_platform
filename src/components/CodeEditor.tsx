import { CODING_QUESTIONS, LANGUAGES } from "@/constants";
import { useState, useEffect, useCallback } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { AlertCircleIcon, BookIcon, LightbulbIcon } from "lucide-react";
import Editor from "@monaco-editor/react";
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { debounce } from 'lodash';

interface CodeEditorProps {
  sessionId: string;
  userId: string;
}

function CodeEditor({ sessionId, userId }: CodeEditorProps) {
  const [selectedQuestion, setSelectedQuestion] = useState(CODING_QUESTIONS[0]);
  const [language, setLanguage] = useState<"javascript" | "python" | "java">(LANGUAGES[0].id);
  const [code, setCode] = useState(selectedQuestion.starterCode[language]);
  const [editor, setEditor] = useState<any>(null);
  const [isUpdatingFromServer, setIsUpdatingFromServer] = useState(false);

  // Convex queries and mutations
  const codeSession = useQuery(api.codeEditor.getCodeSession, { sessionId });
  const updateCode = useMutation(api.codeEditor.updateCode);
  const updateLanguage = useMutation(api.codeEditor.updateLanguage);
  const updateQuestion = useMutation(api.codeEditor.updateQuestion);

  // Debounced update function to avoid too many database calls
  const debouncedUpdateCode = useCallback(
    debounce((code: string) => {
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

  // Initialize from server data
  useEffect(() => {
    if (codeSession && !isUpdatingFromServer) {
      setIsUpdatingFromServer(true);
      
      // Update question if different
      if (codeSession.questionId !== selectedQuestion.id) {
        const question = CODING_QUESTIONS.find(q => q.id === codeSession.questionId);
        if (question) {
          setSelectedQuestion(question);
        }
      }
      
      // Update language if different
      if (codeSession.language !== language) {
        setLanguage(codeSession.language as "javascript" | "python" | "java");
      }
      
      // Update code if different and editor exists
      if (codeSession.code !== code) {
        setCode(codeSession.code);
        if (editor) {
          const position = editor.getPosition();
          editor.setValue(codeSession.code);
          if (position) {
            editor.setPosition(position);
          }
        }
      }
      
      setIsUpdatingFromServer(false);
    }
  }, [codeSession, editor]);

  // Handle question change
  const handleQuestionChange = (questionId: string) => {
    const question = CODING_QUESTIONS.find((q) => q.id === questionId)!;
    setSelectedQuestion(question);
    const newCode = question.starterCode[language];
    setCode(newCode);
    
    // Update on server
    updateQuestion({
      sessionId,
      questionId,
      code: newCode,
      userId,
    });
    
    // Update editor
    if (editor) {
      editor.setValue(newCode);
    }
  };

  // Handle language change
  const handleLanguageChange = (newLanguage: "javascript" | "python" | "java") => {
    setLanguage(newLanguage);
    const newCode = selectedQuestion.starterCode[newLanguage];
    setCode(newCode);
    
    // Update on server
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
    
    // Update editor
    if (editor) {
      editor.setValue(newCode);
    }
  };

  // Handle Monaco Editor mount
  const handleEditorDidMount = (editorInstance: any) => {
    setEditor(editorInstance);
    
    // Listen for content changes
    editorInstance.onDidChangeModelContent(() => {
      if (!isUpdatingFromServer) {
        const content = editorInstance.getValue();
        setCode(content);
        debouncedUpdateCode(content);
      }
    });
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-screen">
      {/* QUESTION SECTION */}
      <ResizablePanel defaultSize={50} minSize={30}>
        <ScrollArea className="h-full">
          <div className="p-6">
            {/* HEADER */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookIcon className="w-5 h-5" />
                  {selectedQuestion.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose your language and solve the problem
                </p>
              </CardHeader>
            </Card>

            {/* QUESTION SELECTOR */}
            <div className="mb-4">
              <Select value={selectedQuestion.id} onValueChange={handleQuestionChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CODING_QUESTIONS.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* LANGUAGE SELECTOR */}
            <div className="mb-6">
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger>
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

            {/* PROBLEM DESCRIPTION */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircleIcon className="w-5 h-5" />
                  Problem Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{selectedQuestion.description}</p>
              </CardContent>
            </Card>

            {/* EXAMPLES */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LightbulbIcon className="w-5 h-5" />
                  Examples
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedQuestion.examples.map((example, index) => (
                  <div key={index} className="mb-4 last:mb-0">
                    <h4 className="font-semibold mb-2">Example {index + 1}:</h4>
                    <div className="bg-muted p-3 rounded-md font-mono text-sm">
                      <pre>
                        Input: {example.input}
                        Output: {example.output}
                        {example.explanation && (
                          <>
                            Explanation: {example.explanation}
                          </>
                        )}
                      </pre>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* CONSTRAINTS */}
            {selectedQuestion.constraints && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircleIcon className="w-5 h-5" />
                    Constraints
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedQuestion.constraints.map((constraint, index) => (
                      <li key={index} className="text-sm">{constraint}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
          <ScrollBar />
        </ScrollArea>
      </ResizablePanel>

      <ResizableHandle />

      {/* CODE EDITOR */}
      <ResizablePanel defaultSize={50} minSize={30}>
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
            padding: { top: 16, bottom: 16 },
            wordWrap: "on",
            wrappingIndent: "indent",
          }}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export default CodeEditor;
