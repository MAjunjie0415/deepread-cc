'use client';

import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

interface NoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
}

export function NoteEditor({ 
  value, 
  onChange, 
  height = "400px" 
}: NoteEditorProps) {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    
    // Configure editor
    editor.updateOptions({
      wordWrap: 'on',
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      renderWhitespace: 'selection',
      rulers: [80, 120],
      suggest: {
        showKeywords: true,
        showSnippets: true,
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false,
      }
    });

    // Add custom keybindings
    // Note: Monaco keybindings would need proper monaco types
    // For now, we'll skip this feature
  };

  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '');
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 text-xs text-gray-600 border-b">
        Markdown Editor • Auto-saved to localStorage
      </div>
      <Editor
        height={height}
        language="markdown"
        theme="vs-light"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          selectOnLineNumbers: true,
          roundedSelection: false,
          readOnly: false,
          cursorStyle: 'line',
          automaticLayout: true,
        }}
      />
    </div>
  );
}
