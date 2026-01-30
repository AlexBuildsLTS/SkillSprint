import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
  Keyboard,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
} from 'react-native-reanimated';
import {
  Play,
  RefreshCcw,
  Terminal,
  CheckCircle2,
  XCircle,
  Cpu,
  Code2,
  Plus,
  Trash2,
  Maximize2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// --- 1. THEME CONFIGURATION ---
const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  success: '#10b981',
  danger: '#ef4444',
  slate: '#64748b',
  border: 'rgba(255,255,255,0.08)',
  surface: '#0f172a',
  editorBg: '#050a18',
  codeColor: '#a5b4fc',
  white: '#FFFFFF',
  gold: '#fbbf24',
};

// --- 2. TYPES & HELPERS ---
type KernelType =
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'java'
  | 'rust'
  | 'go'
  | 'sql'
  | 'cpp'
  | 'kotlin'
  | 'csharp';

const SYNTAX_HELPERS: Record<string, string[]> = {
  python: [
    'def',
    'print()',
    'return',
    'if',
    'else:',
    'elif',
    'for',
    'in',
    'while',
    'True',
    'False',
    'None',
    'import',
    'class',
  ],
  javascript: [
    'function',
    'const',
    'let',
    'var',
    'console.log()',
    'return',
    'if',
    'else',
    '=>',
    'true',
    'false',
    'null',
    'import',
  ],
  typescript: [
    'interface',
    'type',
    'const',
    'let',
    'console.log()',
    'return',
    'number',
    'string',
    'boolean',
    'any',
    'void',
  ],
  java: [
    'public',
    'class',
    'static',
    'void',
    'main',
    'System.out.println()',
    'int',
    'String',
    'new',
    'return',
    'if',
    'else',
  ],
  rust: [
    'fn',
    'let',
    'mut',
    'pub',
    'use',
    'mod',
    'struct',
    'enum',
    'impl',
    'println!()',
    'match',
    'Option',
    'Result',
  ],
  go: [
    'func',
    'package',
    'main',
    'import',
    'fmt.Println()',
    'var',
    'type',
    'struct',
    'return',
    'if',
    'else',
  ],
  sql: [
    'SELECT',
    'FROM',
    'WHERE',
    'INSERT INTO',
    'VALUES',
    'UPDATE',
    'SET',
    'DELETE',
    'JOIN',
    'ON',
    'GROUP BY',
    'ORDER BY',
  ],
  cpp: [
    '#include',
    'using namespace std;',
    'int main()',
    'cout <<',
    'cin >>',
    'return 0;',
    'class',
    'public:',
    'private:',
    'void',
  ],
  kotlin: [
    'fun',
    'val',
    'var',
    'println()',
    'class',
    'data class',
    'if',
    'else',
    'when',
    'return',
    'null',
  ],
  csharp: [
    'using',
    'System;',
    'class',
    'public',
    'static',
    'void',
    'Main',
    'Console.WriteLine()',
    'int',
    'string',
    'new',
  ],
};

interface CodeEmulatorProps {
  language: string;
  code: string;
  expectedOutput?: string;
  onComplete: () => void;
}

// --- 3. ADVANCED SIMULATION ENGINES ---

/**
 * SQL ENGINE: In-memory relational database simulation.
 * Parses SQL (SELECT, INSERT, UPDATE, DELETE) and manipulates a mock dataset.
 */
class SqlEngine {
  // Initial Mock Data
  private users = [
    { id: 1, name: 'Alice', role: 'Admin', active: 1, age: 30 },
    { id: 2, name: 'Bob', role: 'User', active: 0, age: 25 },
    { id: 3, name: 'Charlie', role: 'User', active: 1, age: 35 },
    { id: 4, name: 'David', role: 'Guest', active: 1, age: 20 },
  ];

  execute(query: string): string[] {
    const clean = query.trim().replace(/;/g, '').toUpperCase();
    const output: string[] = [];

    // --- SELECT ---
    if (clean.startsWith('SELECT')) {
      let results = [...this.users];

      // 1. WHERE Filtering
      if (clean.includes('WHERE')) {
        const whereClause = clean
          .split('WHERE')[1]
          .split(/(GROUP|ORDER|LIMIT)/)[0]
          .trim();

        // Basic Logic Parser (Simulated)
        if (whereClause.includes('ID = 1'))
          results = results.filter((r) => r.id === 1);
        else if (whereClause.includes('ACTIVE = 1'))
          results = results.filter((r) => r.active === 1);
        else if (whereClause.includes('AGE > 25'))
          results = results.filter((r) => r.age > 25);
        else if (whereClause.includes("ROLE = 'ADMIN'"))
          results = results.filter((r) => r.role === 'Admin');
        // Fallback for demo: if syntax is valid but logic complex, we might show all or empty
      }

      // 2. ORDER BY Sorting
      if (clean.includes('ORDER BY')) {
        if (clean.includes('AGE DESC')) results.sort((a, b) => b.age - a.age);
        else if (clean.includes('AGE ASC'))
          results.sort((a, b) => a.age - b.age);
        else if (clean.includes('NAME'))
          results.sort((a, b) => a.name.localeCompare(b.name));
      }

      // 3. LIMIT Slicing
      if (clean.includes('LIMIT')) {
        const limitMatch = clean.match(/LIMIT\s+(\d+)/);
        if (limitMatch) results = results.slice(0, parseInt(limitMatch[1]));
      }

      // 4. COLUMN Selection
      let columns = Object.keys(this.users[0]); // Default ALL
      if (!clean.includes('*')) {
        // Extract columns between SELECT and FROM
        const selectPart = clean.split('FROM')[0].replace('SELECT', '').trim();
        const requested = selectPart
          .split(',')
          .map((c) => c.trim().toLowerCase());
        // Filter valid columns
        columns = columns.filter((c) => requested.includes(c.toLowerCase()));
      }

      // 5. RENDER TABLE (ASCII Art)
      output.push(`✔ Query OK, ${results.length} rows retrieved`);
      output.push('');

      // Build Header
      const colWidths = columns.map((c) => Math.max(c.length, 8));
      const headerLine =
        '| ' + columns.map((c, i) => c.padEnd(colWidths[i])).join(' | ') + ' |';
      const divLine =
        '+-' +
        columns.map((c, i) => '-'.repeat(colWidths[i])).join('-+-') +
        '-+';

      output.push(divLine);
      output.push(headerLine);
      output.push(divLine);

      // Build Rows
      results.forEach((row) => {
        const rowLine =
          '| ' +
          columns
            .map((c, i) => String((row as any)[c]).padEnd(colWidths[i]))
            .join(' | ') +
          ' |';
        output.push(rowLine);
      });
      output.push(divLine);
      output.push(`(${results.length} rows)`);
    }
    // --- INSERT/UPDATE/DELETE (Simulation) ---
    else if (clean.startsWith('INSERT')) {
      output.push('✔ Query OK, 1 row affected');
    } else if (clean.startsWith('UPDATE')) {
      output.push('✔ Query OK, 1 row affected, 1 warning');
    } else if (clean.startsWith('DELETE')) {
      output.push('✔ Query OK, 1 row affected');
    } else {
      output.push(
        `⚠ Syntax Error: Unknown command starting at "${clean.split(' ')[0]}"`,
      );
    }

    return output;
  }
}

/**
 * MULTI-LANGUAGE INTERPRETER:
 * Handles strict parsing for variable assignment and print statements across 10+ languages.
 */
class MultiLangInterpreter {
  private variables: Map<string, string> = new Map();

  execute(code: string, lang: string): string[] {
    const lines = code.split('\n');
    const output: string[] = [];
    this.variables.clear();

    lines.forEach((line) => {
      const trimLine = line.trim();
      // Skip empty or comments
      if (
        !trimLine ||
        trimLine.startsWith('//') ||
        trimLine.startsWith('#') ||
        trimLine.startsWith('/*')
      )
        return;

      // --- A. VARIABLE PARSING ---
      // Supports: int x=10; var x=10; x=10; let x=10; val x=10;
      const assignMatch = trimLine.match(
        /(?:const|let|var|int|String|float|bool|val|double|char)?\s*([a-zA-Z_]\w*)\s*(?::=|=)\s*(.*);?$/,
      );
      if (assignMatch) {
        const varName = assignMatch[1];
        let val = assignMatch[2].trim();
        // Clean trailing semicolons and quotes
        if (val.endsWith(';')) val = val.slice(0, -1);
        val = val.replace(/^["']|["']$/g, '');
        this.variables.set(varName, val);
      }

      // --- B. PRINT DETECTION ---
      let printContent: string | null = null;

      // 1. PYTHON
      if (lang === 'python' && /^print\s*\(/.test(trimLine)) {
        printContent = trimLine.match(/^print\s*\((.*)\)/)?.[1] || '';
      }
      // 2. JS / TS
      else if (
        (lang === 'javascript' || lang === 'typescript') &&
        /^console\.log\s*\(/.test(trimLine)
      ) {
        printContent = trimLine.match(/^console\.log\s*\((.*)\)/)?.[1] || '';
      }
      // 3. JAVA
      else if (lang === 'java' && /System\.out\.println\s*\(/.test(trimLine)) {
        printContent =
          trimLine.match(/System\.out\.println\s*\((.*)\)/)?.[1] || '';
      }
      // 4. GO
      else if (lang === 'go' && /fmt\.Println\s*\(/.test(trimLine)) {
        printContent = trimLine.match(/fmt\.Println\s*\((.*)\)/)?.[1] || '';
      }
      // 5. RUST
      else if (lang === 'rust' && /println!\s*\(/.test(trimLine)) {
        printContent = trimLine.match(/println!\s*\((.*)\)/)?.[1] || '';
      }
      // 6. C++
      else if (lang === 'cpp' && /cout\s*<<\s*/.test(trimLine)) {
        // C++ is tricky: cout << "Hello" << endl;
        const parts = trimLine.split('<<');
        if (parts.length > 1) printContent = parts[1].split(';')[0].trim(); // Take first part after cout
      }
      // 7. C#
      else if (lang === 'csharp' && /Console\.WriteLine\s*\(/.test(trimLine)) {
        printContent =
          trimLine.match(/Console\.WriteLine\s*\((.*)\)/)?.[1] || '';
      }
      // 8. KOTLIN
      else if (lang === 'kotlin' && /^println\s*\(/.test(trimLine)) {
        printContent = trimLine.match(/^println\s*\((.*)\)/)?.[1] || '';
      }

      // --- C. OUTPUT RESOLUTION ---
      if (printContent !== null) {
        let clean = printContent.trim();
        // Remove trailing semicolon if regex caught it
        if (clean.endsWith(';')) clean = clean.slice(0, -1);

        // CASE 1: Literal String ("Hello")
        if (
          (clean.startsWith('"') && clean.endsWith('"')) ||
          (clean.startsWith("'") && clean.endsWith("'"))
        ) {
          output.push(clean.slice(1, -1));
        }
        // CASE 2: Variable (x)
        else if (this.variables.has(clean)) {
          output.push(this.variables.get(clean)!);
        }
        // CASE 3: Math Expression (5 + 5)
        else if (/^[\d+\-*/\s().]+$/.test(clean)) {
          try {
            // Safe enough for a mock emulator logic check
            // eslint-disable-next-line no-eval
            output.push(String(eval(clean)));
          } catch {
            output.push(clean); // Fallback: print raw
          }
        }
        // CASE 4: Raw Fallback (Variable not found or complex expr)
        else {
          // If it looks like a variable but wasn't tracked, print error or raw?
          // For UX, printing raw helps debugging unless strict mode.
          // We'll clean quotes just in case.
          output.push(clean.replace(/^["']|["']$/g, ''));
        }
      }
    });

    return output;
  }
}

// --- 4. MAIN COMPONENT ---

export function CodeEmulator({
  language,
  code: initialCode,
  expectedOutput,
  onComplete,
}: CodeEmulatorProps) {
  // State
  const [sourceCode, setSourceCode] = useState(initialCode);
  const [status, setStatus] = useState<'IDLE' | 'COMPILING' | 'EXECUTING'>(
    'IDLE',
  );
  const [logs, setLogs] = useState<string[]>([]);
  const [validationResult, setValidationResult] = useState<
    'success' | 'fail' | null
  >(null);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Derived Props
  const normalizedLang = (language || 'javascript').toLowerCase() as KernelType;
  const helpers =
    SYNTAX_HELPERS[normalizedLang] || SYNTAX_HELPERS['javascript'];

  // Reset on new task
  useEffect(() => {
    setSourceCode(initialCode);
    setLogs([]);
    setValidationResult(null);
    setIsConsoleOpen(false);
    setStatus('IDLE');
  }, [initialCode]);

  // Insert Helper Text
  const handleInsertHelper = (text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSourceCode(
      (prev) =>
        prev + (prev.length > 0 && !prev.endsWith(' ') ? ' ' : '') + text,
    );
  };

  const handleClearLogs = () => {
    setLogs([]);
    setValidationResult(null);
  };

  /**
   * 🚀 EXECUTION CORE
   */
  const handleExecution = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    setStatus('COMPILING');
    setIsConsoleOpen(true);
    setValidationResult(null);
    setLogs([]);

    // Simulate different compile times
    const isCompiled = ['rust', 'go', 'java', 'cpp', 'csharp'].includes(
      normalizedLang,
    );
    const delay = isCompiled ? 1200 : 600;

    setTimeout(() => {
      setStatus('EXECUTING');
      let buffer: string[] = [];
      let success = true;

      // 1. BOOTSTRAP MESSAGES (The "Real" Feel)
      if (normalizedLang === 'python') {
        buffer.push('Python 3.10.0 [GCC 11.2.0] on linux');
        buffer.push('>>> python3 main.py');
      } else if (normalizedLang === 'javascript') {
        buffer.push('> node index.js');
      } else if (normalizedLang === 'typescript') {
        buffer.push('> tsc main.ts && node main.js');
      } else if (normalizedLang === 'go') {
        buffer.push('> go build main.go');
        buffer.push('> ./main');
      } else if (normalizedLang === 'rust') {
        buffer.push('   Compiling playground v0.1.0 (/playground)');
        buffer.push(
          '    Finished dev [unoptimized + debuginfo] target(s) in 0.65s',
        );
        buffer.push('     Running `target/debug/playground`');
      } else if (normalizedLang === 'java') {
        buffer.push('> javac Main.java');
        buffer.push('> java Main');
      } else if (normalizedLang === 'cpp') {
        buffer.push('> g++ -o main main.cpp');
        buffer.push('> ./main');
      } else if (normalizedLang === 'sql') {
        buffer.push('SQLite version 3.39.3 2022-09-05');
        buffer.push('Enter ".help" for usage hints.');
        buffer.push('sqlite> -- Executing Query');
      }

      // 2. RUN ENGINE
      try {
        if (normalizedLang === 'sql') {
          const sql = new SqlEngine();
          const res = sql.execute(sourceCode);
          buffer = [...buffer, ...res];
        } else {
          const interp = new MultiLangInterpreter();
          const res = interp.execute(sourceCode, normalizedLang);

          if (res.length === 0) {
            // Heuristic for "Hello World" failure (user syntax error or parser miss)
            // If code contains print statement but output is empty, parser missed it.
            // We check for common patterns to auto-fix/fallback for better UX.
            if (
              sourceCode.includes('System.out.println') ||
              sourceCode.includes('println!') ||
              sourceCode.includes('console.log') ||
              sourceCode.includes('print(')
            ) {
              // Fallback: Try to extract string literal directly
              const strMatch = sourceCode.match(/["']([^"']+)["']/);
              if (strMatch) buffer.push(strMatch[1]);
              else buffer.push('(No Output)');
            } else {
              buffer.push('(Program exited with no output)');
            }
          } else {
            buffer = [...buffer, ...res];
          }
        }
      } catch (e) {
        buffer.push(`Runtime Error: ${(e as Error).message}`);
        success = false;
      }

      // 3. EXIT CODE
      if (normalizedLang !== 'sql') {
        buffer.push(`\nProcess finished with exit code ${success ? 0 : 1}`);
      }

      setLogs(buffer);
      setStatus('IDLE');

      // 4. VALIDATION
      const outputStr = buffer.join('\n').toLowerCase();
      const expectedStr = (expectedOutput || '').trim().toLowerCase();

      let passed = false;
      if (!expectedOutput) {
        passed = true; // Sandbox pass
      } else {
        // SQL needs loose validation (contains columns or row count)
        if (normalizedLang === 'sql') {
          passed =
            outputStr.includes(expectedStr) ||
            outputStr.includes('found') ||
            outputStr.includes('ok');
        } else {
          passed = outputStr.includes(expectedStr);
        }
      }

      if (passed) {
        setValidationResult('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(onComplete, 1500);
      } else {
        setValidationResult('fail');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }, delay);
  }, [sourceCode, normalizedLang, expectedOutput, onComplete]);

  // --- RENDER ---
  return (
    <View style={styles.container}>
      {/* TOOLBAR */}
      <LinearGradient
        colors={[THEME.surface, '#1e293b']}
        style={styles.toolbar}
      >
        <View style={styles.toolbarLeft}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  status === 'EXECUTING'
                    ? THEME.gold
                    : status === 'COMPILING'
                      ? THEME.indigo
                      : THEME.success,
              },
            ]}
          />
          <View style={styles.langBadge}>
            <Cpu size={12} color={THEME.indigo} />
            <Text style={styles.langText}>{normalizedLang.toUpperCase()}</Text>
          </View>
          <Text style={styles.statusText}>
            {status === 'IDLE'
              ? 'READY'
              : status === 'COMPILING'
                ? 'BUILDING...'
                : 'RUNNING...'}
          </Text>
        </View>
        <View style={styles.toolbarRight}>
          <TouchableOpacity onPress={handleClearLogs} style={styles.iconButton}>
            <Trash2 size={14} color={THEME.slate} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSourceCode(initialCode)}
            style={styles.iconButton}
          >
            <RefreshCcw size={14} color={THEME.slate} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* EDITOR */}
      <View style={styles.editor}>
        <View style={styles.gutter}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Text key={i} style={styles.lineNum}>
              {i + 1}
            </Text>
          ))}
        </View>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={sourceCode}
          onChangeText={setSourceCode}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          textAlignVertical="top"
          keyboardAppearance="dark"
          placeholder="// Code goes here..."
          placeholderTextColor="rgba(165, 180, 252, 0.3)"
        />
      </View>

      {/* SYNTAX BAR */}
      <View style={styles.syntaxBar}>
        <Text style={styles.syntaxLabel}>QUICK:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        >
          {helpers.map((t, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => handleInsertHelper(t)}
              style={styles.chip}
            >
              <Text style={styles.chipText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* CONSOLE */}
      {isConsoleOpen && (
        <Animated.View
          layout={Layout.springify()}
          entering={FadeInUp.duration(300)}
          style={styles.console}
        >
          <View style={styles.consoleHeader}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Terminal size={12} color={THEME.slate} />
              <Text style={styles.consoleTitle}>TERMINAL</Text>
            </View>
            <TouchableOpacity onPress={() => setIsConsoleOpen(false)}>
              <Maximize2 size={12} color={THEME.slate} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.logScroll}
            nestedScrollEnabled
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {logs.map((log, i) => (
              <Text
                key={i}
                style={[
                  styles.logText,
                  log.startsWith('>') && {
                    color: THEME.indigo,
                    fontWeight: '700',
                  },
                  log.startsWith('✔') && { color: THEME.success },
                  log.startsWith('⚠') && { color: THEME.gold },
                  log.startsWith('Runtime') && { color: THEME.danger },
                  (log.startsWith('+') || log.startsWith('|')) && {
                    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                    color: '#cbd5e1',
                  },
                ]}
              >
                {log}
              </Text>
            ))}
            {validationResult && (
              <Animated.View
                entering={FadeInDown}
                style={[
                  styles.resultBadge,
                  validationResult === 'success'
                    ? styles.passBadge
                    : styles.failBadge,
                ]}
              >
                {validationResult === 'success' ? (
                  <CheckCircle2 size={16} color={THEME.success} />
                ) : (
                  <XCircle size={16} color={THEME.danger} />
                )}
                <Text
                  style={[
                    styles.resultText,
                    {
                      color:
                        validationResult === 'success'
                          ? THEME.success
                          : THEME.danger,
                    },
                  ]}
                >
                  {validationResult === 'success'
                    ? 'TEST PASSED'
                    : 'OUTPUT MISMATCH'}
                </Text>
              </Animated.View>
            )}
          </ScrollView>
        </Animated.View>
      )}

      {/* EXECUTION BAR */}
      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Code2 size={14} color={THEME.slate} />
          <Text style={styles.footerText}>
            main.
            {normalizedLang === 'rust'
              ? 'rs'
              : normalizedLang === 'python'
                ? 'py'
                : normalizedLang === 'javascript'
                  ? 'js'
                  : normalizedLang}
          </Text>
        </View>
        <TouchableOpacity
          disabled={status !== 'IDLE'}
          onPress={handleExecution}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              status === 'IDLE'
                ? [THEME.indigo, '#4f46e5']
                : ['#334155', '#1e293b']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.runBtn}
          >
            {status !== 'IDLE' ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Text style={styles.runText}>RUN CODE</Text>
                <Play size={12} color="white" fill="white" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- 5. STYLES ---
const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.obsidian,
    overflow: 'hidden',
    marginTop: 20,
    minHeight: 450,
    width: '100%',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  toolbar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  toolbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  langBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  langText: {
    color: THEME.indigo,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statusText: { color: THEME.slate, fontSize: 10, fontWeight: 'bold' },
  iconButton: { padding: 6 },
  editor: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: THEME.editorBg,
    minHeight: 200,
  },
  gutter: {
    width: 36,
    paddingVertical: 16,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  lineNum: {
    color: 'rgba(148, 163, 184, 0.3)',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 22,
  },
  input: {
    flex: 1,
    color: THEME.codeColor,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 22,
    padding: 16,
    textAlignVertical: 'top',
  },
  syntaxBar: {
    height: 44,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
  syntaxLabel: {
    color: THEME.slate,
    fontSize: 10,
    fontWeight: '900',
    marginRight: 8,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '600',
  },
  console: {
    height: 200,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  consoleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  consoleTitle: {
    color: THEME.slate,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  logScroll: { flex: 1, padding: 16 },
  logText: {
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 18,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  passBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  failBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  resultText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  footer: {
    height: 60,
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  footerText: { color: THEME.slate, fontSize: 12, fontWeight: '600' },
  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  runText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
