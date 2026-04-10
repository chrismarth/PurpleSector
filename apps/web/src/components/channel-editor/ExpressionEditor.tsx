'use client';

import { useRef, useEffect, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor, languages, IPosition, IDisposable } from 'monaco-editor';

interface ExpressionEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  variables?: string[]; // Variable names for autocomplete
  height?: string;
  placeholder?: string;
}

export function ExpressionEditor({
  value,
  onChange,
  onBlur,
  variables = [],
  height = '100px',
  placeholder = 'Enter expression...',
}: ExpressionEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const completionProviderRef = useRef<IDisposable | null>(null);
  const [isDark, setIsDark] = useState(() => {
    // Check theme immediately during initialization
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true; // Default to dark if document not available (SSR)
  });
  const [bgColor, setBgColor] = useState('#1E1E1E');

  // Detect theme from document and get actual background color
  useEffect(() => {
    const checkTheme = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
      
      // Get the actual background color from CSS
      const computedBg = getComputedStyle(document.documentElement)
        .getPropertyValue('--background')
        .trim();
      
      if (computedBg) {
        // Convert hsl to hex if needed, or use a default
        setBgColor(isDarkMode ? '#0a0a0a' : '#ffffff');
      }
    };
    
    checkTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Disable all TypeScript/JavaScript language features to prevent duplicates
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      noLib: true,
      allowNonTsExtensions: true,
    });

    // Register a custom language for math expressions to avoid JS interference
    monaco.languages.register({ id: 'mathexpr' });
    
    // Get list of math function names for syntax highlighting
    const mathFunctionNames = [
      'abs', 'acos', 'acosh', 'acot', 'acoth', 'acsc', 'acsch', 'asec', 'asech',
      'asin', 'asinh', 'atan', 'atan2', 'atanh', 'cbrt', 'ceil', 'cos', 'cosh',
      'cot', 'coth', 'csc', 'csch', 'derivative', 'exp', 'floor', 'hypot', 'integral',
      'log', 'log10', 'log2', 'max', 'min', 'pow', 'random', 'round', 'sec', 'sech',
      'sign', 'sin', 'sinh', 'sqrt', 'tan', 'tanh', 'pi', 'e', 'Infinity',
    ];
    
    // Register syntax highlighting for math expressions
    monaco.languages.setMonarchTokensProvider('mathexpr', {
      tokenizer: {
        root: [
          [new RegExp(`\\b(${mathFunctionNames.join('|')})\\b`), 'function'],
          [/[a-zA-Z_]\w*/, 'variable'],
          [/\d+\.?\d*/, 'number'],
          [/[+\-*/%^]/, 'operator'],
          [/[(),]/, 'delimiter'],
        ],
      },
    });
    
    // Define custom dark theme with distinct colors for variables and functions
    monaco.editor.defineTheme('mathexpr-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'variable', foreground: '9CDCFE' },  // Light blue for variables (input channels)
        { token: 'function', foreground: 'DCDCAA' },  // Yellow for functions
        { token: 'number', foreground: 'B5CEA8' },    // Light green for numbers
        { token: 'operator', foreground: 'D4D4D4' },  // Light gray for operators
        { token: 'delimiter', foreground: 'D4D4D4' }, // Light gray for delimiters
      ],
      colors: {
        'editor.background': '#0a0a0a',
      },
    });
    
    // Define custom light theme
    monaco.editor.defineTheme('mathexpr-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'variable', foreground: '0070C1' },  // Blue for variables (input channels)
        { token: 'function', foreground: '795E26' },  // Brown for functions
        { token: 'number', foreground: '098658' },    // Green for numbers
        { token: 'operator', foreground: '000000' },  // Black for operators
        { token: 'delimiter', foreground: '000000' }, // Black for delimiters
      ],
      colors: {
        'editor.background': '#ffffff',
      },
    });
    
    // Set the model language to our custom language
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, 'mathexpr');
    }

    // Apply the correct theme immediately after defining it
    const currentTheme = document.documentElement.classList.contains('dark') ? 'mathexpr-dark' : 'mathexpr-light';
    monaco.editor.setTheme(currentTheme);

    // Initial registration will be done by useEffect
  };

  // Update Monaco theme when isDark changes
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    
    // Apply the correct theme
    monaco.editor.setTheme(isDark ? 'mathexpr-dark' : 'mathexpr-light');
  }, [isDark]);

  // Register/update autocomplete provider when variables change
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    // Dispose previous provider if it exists
    if (completionProviderRef.current) {
      completionProviderRef.current.dispose();
    }

    // Register autocomplete provider for our custom language
    completionProviderRef.current = monaco.languages.registerCompletionItemProvider('mathexpr', {
      provideCompletionItems: (model: editor.ITextModel, position: IPosition) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // Math.js functions
        const mathFunctions = [
          'abs', 'acos', 'acosh', 'acot', 'acoth', 'acsc', 'acsch', 'asec', 'asech',
          'asin', 'asinh', 'atan', 'atan2', 'atanh', 'cbrt', 'ceil', 'cos', 'cosh',
          'cot', 'coth', 'csc', 'csch', 'exp', 'floor', 'hypot', 'log', 'log10',
          'log2', 'max', 'min', 'pow', 'random', 'round', 'sec', 'sech', 'sign',
          'sin', 'sinh', 'sqrt', 'tan', 'tanh',
        ];

        const functionSuggestions = mathFunctions.map((func) => ({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: `${func}($0)`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'Math function',
            range,
            sortText: `1_${func}`,
          }));

        // Add special time-series functions
        const timeSeriesFunctions = [
          { label: 'derivative', detail: 'Numerical derivative (rate of change) of a variable' },
          { label: 'integral', detail: 'Cumulative integral (area under curve) of a variable' },
        ];

        const timeSeriesSuggestions = timeSeriesFunctions.map((func) => ({
          label: func.label,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: `${func.label}($0)`,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: func.detail,
          range,
          sortText: `1_${func.label}`,
        }));

        // Variable suggestions
        const variableSuggestions = variables.map((variable) => ({
            label: variable,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: variable,
            detail: 'Input variable',
            range,
            sortText: `0_${variable}`,
          }));

        // Constants
        const constants = [
          { label: 'pi', detail: 'π (3.14159...)' },
          { label: 'e', detail: "Euler's number (2.71828...)" },
          { label: 'Infinity', detail: 'Positive infinity' },
        ];

        const constantSuggestions = constants.map((constant) => ({
            label: constant.label,
            kind: monaco.languages.CompletionItemKind.Constant,
            insertText: constant.label,
            detail: constant.detail,
            range,
            sortText: `2_${constant.label}`,
          }));

        return {
          suggestions: [
            ...variableSuggestions,
            ...functionSuggestions,
            ...timeSeriesSuggestions,
            ...constantSuggestions,
          ],
        };
      },
    });

    return () => {
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
      }
    };
  }, [variables]);

  const handleChange = (value: string | undefined) => {
    onChange(value || '');
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <Editor
        height={height}
        defaultLanguage="mathexpr"
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        theme={isDark ? 'mathexpr-dark' : 'mathexpr-light'}
        options={{
          minimap: { enabled: false },
          lineNumbers: 'off',
          glyphMargin: false,
          folding: false,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 0,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          wrappingIndent: 'indent',
          fontSize: 13,
          fontFamily: 'ui-monospace, monospace',
          padding: { top: 8, bottom: 8 },
          suggest: {
            showWords: false,
            showKeywords: false,
            showSnippets: false,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
          parameterHints: {
            enabled: true,
          },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          tabCompletion: 'on',
          renderLineHighlight: 'none',
          contextmenu: false,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
    </div>
  );
}
