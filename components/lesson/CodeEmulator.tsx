import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Modal,
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
  Alert,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withSequence,
  withTiming,
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
  Minimize2,
  Copy,
  Settings,
  MoreHorizontal,
  ChevronRight,
  Database,
  Server,
  Layers,
  Box,
  Hash,
  HandHelping,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// -----------------------------------------------------------------------------
// 1. THEME & CONFIGURATION
// -----------------------------------------------------------------------------
const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  slate: '#64748b',
  border: 'rgba(255,255,255,0.08)',
  surface: '#0f172a',
  editorBg: '#050a18',
  codeColor: '#a5b4fc',
  white: '#FFFFFF',
  gold: '#fbbf24',
  comment: '#475569',
  keyword: '#c084fc',
  string: '#86efac',
  function: '#60a5fa',
  number: '#fca5a5',
};

// Supported Languages Enum
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
  | 'csharp'
  | 'swift'
  | 'ruby'
  | 'php'
  | 'dart'
  | 'r'
  | 'bash'
  | 'react native';

// Quick-Insert Helpers for Mobile Typing Experience
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
    'import',
    'class',
  ],
  javascript: [
    'function',
    'const',
    'let',
    'console.log()',
    'return',
    'if',
    'else',
    '=>',
    'async',
    'await',
    'try',
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
  ],
  rust: [
    'fn',
    'let',
    'mut',
    'pub',
    'use',
    'mod',
    'println!()',
    'match',
    'Option',
    'Result',
    'vec!',
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
    'LIMIT',
    'COUNT(*)',
    'DISTINCT',
    'AS',
  ],
  cpp: [
    '#include',
    'using namespace std;',
    'int main()',
    'cout <<',
    'cin >>',
    'return 0;',
    'class',
    'void',
    'vector',
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
  ],
  swift: [
    'func',
    'let',
    'var',
    'print()',
    'class',
    'struct',
    'if',
    'else',
    'return',
    'nil',
    'guard',
  ],
  ruby: [
    'def',
    'puts',
    'return',
    'if',
    'else',
    'elsif',
    'end',
    'class',
    'module',
    'nil',
    'true',
  ],
  php: [
    '<?php',
    'echo',
    'function',
    'return',
    '$this',
    'class',
    'public',
    'if',
    'else',
    'foreach',
    'array',
  ],
  dart: [
    'void main()',
    'print()',
    'int',
    'String',
    'bool',
    'final',
    'const',
    'class',
    'if',
    'else',
    'return',
  ],
  r: [
    'print()',
    'c()',
    'function',
    'if',
    'else',
    'for',
    'library()',
    'data.frame',
    'return()',
  ],
  bash: [
    'echo',
    'if',
    'fi',
    'else',
    'for',
    'do',
    'done',
    'while',
    'read',
    'exit',
    'sudo',
    'ls',
  ],
  'react native': [
    'import',
    'React',
    'View',
    'Text',
    'StyleSheet',
    'export',
    'default',
    'const',
    'return',
  ],
};

interface CodeEmulatorProps {
  language: string;
  code: string;
  expectedOutput?: string;
  hint?: string;
  onComplete: () => void;
}

// -----------------------------------------------------------------------------
// 2. ADVANCED SQL ENGINE (ENHANCED)
// -----------------------------------------------------------------------------

class SqlEngine {
  // Complex Mock Database
  private tables: Record<string, any[]> = {
    users: [
      {
        id: 1,
        name: 'Alice',
        email: 'alice@x.com',
        active: 1,
        city: 'NY',
        age: 30,
        created_at: '2023-01-01',
      },
      {
        id: 2,
        name: 'Bob',
        email: 'bob@x.com',
        active: 0,
        city: 'LA',
        age: 25,
        created_at: '2023-02-15',
      },
      {
        id: 3,
        name: 'Charlie',
        email: 'charlie@x.com',
        active: 1,
        city: 'NY',
        age: 35,
        created_at: '2023-03-10',
      },
      {
        id: 4,
        name: 'David',
        email: 'david@x.com',
        active: 1,
        city: 'CHI',
        age: 20,
        created_at: '2023-04-05',
      },
      {
        id: 5,
        name: 'Eve',
        email: 'eve@x.com',
        active: 0,
        city: 'SF',
        age: 40,
        created_at: '2023-05-20',
      },
    ],
    // ADDED CUSTOMERS TABLE TO PREVENT "TABLE NOT FOUND" ERRORS
    customers: [
      { id: 1, name: 'Google', city: 'Mountain View', country: 'USA' },
      { id: 2, name: 'Spotify', city: 'Stockholm', country: 'Sweden' },
      { id: 3, name: 'Samsung', city: 'Seoul', country: 'Korea' },
      { id: 4, name: 'Apple', city: 'Cupertino', country: 'USA' },
      { id: 5, name: 'Microsoft', city: 'Redmond', country: 'USA' },
    ],
    orders: [
      {
        id: 101,
        user_id: 1,
        amount: 150.5,
        status: 'Completed',
        date: '2023-06-01',
      },
      {
        id: 102,
        user_id: 1,
        amount: 50.0,
        status: 'Pending',
        date: '2023-06-02',
      },
      {
        id: 103,
        user_id: 2,
        amount: 200.25,
        status: 'Completed',
        date: '2023-06-03',
      },
      {
        id: 104,
        user_id: 3,
        amount: 75.0,
        status: 'Cancelled',
        date: '2023-06-04',
      },
      {
        id: 105,
        user_id: 1,
        amount: 300.0,
        status: 'Completed',
        date: '2023-06-05',
      },
    ],
    products: [
      {
        id: 1,
        name: 'Laptop',
        price: 999.99,
        stock: 10,
        category: 'Electronics',
      },
      { id: 2, name: 'Mouse', price: 25.5, stock: 50, category: 'Electronics' },
      { id: 3, name: 'Desk', price: 150.0, stock: 30, category: 'Furniture' },
      { id: 4, name: 'Chair', price: 85.0, stock: 20, category: 'Furniture' },
      {
        id: 5,
        name: 'Monitor',
        price: 200.0,
        stock: 15,
        category: 'Electronics',
      },
    ],
    employees: [
      { id: 1, name: 'Sarah', dept: 'HR', salary: 50000, joined: '2020-01-15' },
      { id: 2, name: 'Mike', dept: 'IT', salary: 80000, joined: '2021-03-10' },
      { id: 3, name: 'Jen', dept: 'IT', salary: 85000, joined: '2019-11-05' },
      {
        id: 4,
        name: 'Paul',
        dept: 'Sales',
        salary: 60000,
        joined: '2022-07-20',
      },
    ],
    projects: [
      { id: 1, title: 'Alpha', lead_id: 2, budget: 10000 },
      { id: 2, title: 'Beta', lead_id: 3, budget: 20000 },
      { id: 3, title: 'Gamma', lead_id: 2, budget: 15000 },
    ],
  };

  execute(query: string): string[] {
    // Robust Sanitization
    const clean = query.trim().replace(/;/g, '').replace(/\s+/g, ' ');
    const upper = clean.toUpperCase();
    const output: string[] = [];

    // ---------------- SELECT PARSING LOGIC ----------------
    if (upper.startsWith('SELECT')) {
      let activeTable = 'users';
      let dataset: any[] = [];
      let tableNameDisplay = '';

      // Find 'FROM table_name'
      const fromMatch = upper.match(/FROM\s+([a-zA-Z0-9_]+)/);

      if (fromMatch && fromMatch[1]) {
        const tableName = fromMatch[1].toLowerCase();
        if (this.tables[tableName]) {
          activeTable = tableName;
          dataset = [...this.tables[tableName]];
          tableNameDisplay = tableName;
        } else {
          // Heuristic: Check pluralization
          const plural = tableName + 's';
          if (this.tables[plural]) {
            return [
              `⚠ Error: Table '${tableName}' does not exist. Did you mean '${plural}'?`,
            ];
          }
          return [`⚠ Error: Table '${tableName}' does not exist in schema.`];
        }
      } else {
        return [`⚠ Error: Syntax error. Expected 'FROM table_name'.`];
      }

      // JOIN LOGIC (Visual Simulation)
      if (upper.includes('JOIN')) {
        const joinMatch = upper.match(/JOIN\s+([a-zA-Z0-9_]+)\s+ON/);
        if (joinMatch && joinMatch[1]) {
          const joinTable = joinMatch[1].toLowerCase();
          if (this.tables[joinTable]) {
            tableNameDisplay += ` + ${joinTable}`;
          }
        }
      }

      let results = [...dataset];

      // WHERE CLAUSE (Robust)
      if (upper.includes('WHERE')) {
        const whereSection = upper
          .split('WHERE')[1]
          .split(/(GROUP|ORDER|LIMIT)/)[0]
          .trim();

        results = results.filter((row) => {
          let match = true;

          // Numeric: col > 5
          const numMatch = whereSection.match(
            /([a-zA-Z0-9_]+)\s*([=><]+)\s*(\d+)/,
          );
          if (numMatch) {
            const col = numMatch[1].toLowerCase();
            const op = numMatch[2];
            const val = parseFloat(numMatch[3]);

            if (row[col] !== undefined) {
              if (op === '=') match = match && row[col] === val;
              if (op === '>') match = match && row[col] > val;
              if (op === '<') match = match && row[col] < val;
              if (op === '>=') match = match && row[col] >= val;
              if (op === '<=') match = match && row[col] <= val;
            }
          }

          // String: col = 'val'
          const strMatch = whereSection.match(
            /([a-zA-Z0-9_]+)\s*=\s*['"]([^'"]+)['"]/,
          );
          if (strMatch) {
            const col = strMatch[1].toLowerCase();
            const val = strMatch[2];
            if (row[col] !== undefined) {
              match = match && String(row[col]) === val;
            }
          }

          // Boolean
          if (whereSection.includes('TRUE') || whereSection.includes('1')) {
            if (row.active !== undefined) match = match && !!row.active;
          }
          if (whereSection.includes('FALSE') || whereSection.includes('0')) {
            if (row.active !== undefined) match = match && !row.active;
          }

          return match;
        });
      }

      // GROUP BY (Simulated sort)
      if (upper.includes('GROUP BY')) {
        const groupByCol = upper
          .split('GROUP BY')[1]
          .split(/(ORDER|LIMIT)/)[0]
          .trim()
          .toLowerCase();
        if (results.length > 0 && results[0][groupByCol] !== undefined) {
          results.sort((a, b) =>
            String(a[groupByCol]).localeCompare(String(b[groupByCol])),
          );
        }
      }

      // ORDER BY
      if (upper.includes('ORDER BY')) {
        const orderSection = upper
          .split('ORDER BY')[1]
          .split('LIMIT')[0]
          .trim();
        const parts = orderSection.split(' ');
        const col = parts[0].toLowerCase();
        const dir = parts[1] === 'DESC' ? -1 : 1;

        results.sort((a, b) => {
          const valA = a[col];
          const valB = b[col];
          if (typeof valA === 'number' && typeof valB === 'number')
            return (valA - valB) * dir;
          return String(valA).localeCompare(String(valB)) * dir;
        });
      }

      // LIMIT
      if (upper.includes('LIMIT')) {
        const limitMatch = upper.match(/LIMIT\s+(\d+)/);
        if (limitMatch) {
          results = results.slice(0, parseInt(limitMatch[1], 10));
        }
      }

      // COLUMN PROJECTION (Fix for SELECT city FROM customers)
      let columns = Object.keys(dataset[0] || {});
      const selectIdx = clean.toUpperCase().indexOf('SELECT') + 6;
      const fromIdx = clean.toUpperCase().indexOf('FROM');
      const selectPart = clean.substring(selectIdx, fromIdx).trim();

      if (selectPart !== '*' && selectPart !== '') {
        const requested = selectPart
          .split(',')
          .map((c) => c.trim().toLowerCase());

        if (requested.some((r) => r.includes('count'))) {
          output.push(`| COUNT(*) |`);
          output.push(`| ${String(results.length).padEnd(8)} |`);
          return output;
        }

        const validColumns = columns.filter((col) =>
          requested.includes(col.toLowerCase()),
        );
        if (validColumns.length > 0) {
          columns = validColumns;
        } else {
          // Case insensitive check
          return [`⚠ Error: Unknown column(s) in '${selectPart}'`];
        }
      }

      // RENDER OUTPUT
      output.push(
        `✔ Query OK, ${results.length} rows retrieved from '${tableNameDisplay}'`,
      );
      output.push('');

      if (results.length > 0) {
        const colWidths = columns.map((c) => {
          const headerLen = c.length;
          const maxDataLen = Math.max(
            ...results.map((r) => String(r[c] || '').length),
          );
          return Math.max(headerLen, maxDataLen, 8);
        });

        const drawLine = () =>
          '+-' +
          columns.map((c, i) => '-'.repeat(colWidths[i])).join('-+-') +
          '-+';
        const headerLine =
          '| ' +
          columns.map((c, i) => c.padEnd(colWidths[i])).join(' | ') +
          ' |';

        output.push(drawLine());
        output.push(headerLine);
        output.push(drawLine());

        results.forEach((row) => {
          const rowLine =
            '| ' +
            columns
              .map((c, i) => {
                const rawVal = (row as any)[c];
                const val =
                  rawVal === undefined || rawVal === null
                    ? 'NULL'
                    : String(rawVal);
                return val.padEnd(colWidths[i]);
              })
              .join(' | ') +
            ' |';
          output.push(rowLine);
        });

        output.push(drawLine());
        output.push(`(${results.length} rows in set)`);
      } else {
        output.push('Empty set (0.00 sec)');
      }
    }
    // ---------------- OTHER COMMANDS ----------------
    else if (
      upper.startsWith('INSERT') ||
      upper.startsWith('UPDATE') ||
      upper.startsWith('DELETE')
    ) {
      output.push('✔ Query OK, 1 row affected (0.01 sec)');
    } else {
      output.push(
        `⚠ SQL Error (1064): You have an error in your SQL syntax near '${clean.split(' ')[0]}'`,
      );
    }

    return output;
  }
}

// -----------------------------------------------------------------------------
// 3. MULTI-LANGUAGE INTERPRETER
// -----------------------------------------------------------------------------

class MultiLangInterpreter {
  private variables: Map<string, string> = new Map();

  execute(code: string, lang: string): string[] {
    const lines = code.split('\n');
    const output: string[] = [];
    this.variables.clear();

    lines.forEach((line) => {
      const trimLine = line.trim();
      if (
        !trimLine ||
        trimLine.startsWith('//') ||
        trimLine.startsWith('#') ||
        trimLine.startsWith('/*')
      )
        return;

      // Variable Assignment (supports int x = 10, var x = 10, x = 10)
      const assignRegex =
        /(?:const|let|var|int|String|float|bool|val|double|char|auto|string)\s+([a-zA-Z_]\w*)\s*(?::=|=)\s*(.*);?$/;
      const assignMatch = trimLine.match(assignRegex);
      const simpleAssignMatch = trimLine.match(/^([a-zA-Z_]\w*)\s*=\s*(.*)$/);

      let varName, val;

      if (assignMatch) {
        varName = assignMatch[1];
        val = assignMatch[2].trim();
      } else if (
        simpleAssignMatch &&
        !trimLine.includes('==') &&
        !trimLine.startsWith('if') &&
        !trimLine.startsWith('return')
      ) {
        varName = simpleAssignMatch[1];
        val = simpleAssignMatch[2].trim();
      }

      if (varName && val) {
        if (val.endsWith(';')) val = val.slice(0, -1);
        val = val.replace(/^["']|["']$/g, '');
        this.variables.set(varName, val);
      }

      // Print Detection
      let printContent: string | null = null;

      // KOTLIN
      if (lang === 'kotlin' && /^println\s*\(/.test(trimLine)) {
        printContent = trimLine.match(/^println\s*\((.*)\)/)?.[1] || '';
      }
      // SWIFT
      else if (lang === 'swift' && /^print\s*\(/.test(trimLine)) {
        printContent = trimLine.match(/^print\s*\((.*)\)/)?.[1] || '';
      }
      // PYTHON
      else if (lang === 'python' && /^print\s*\(/.test(trimLine)) {
        printContent = trimLine.match(/^print\s*\((.*)\)/)?.[1] || '';
      }
      // JS/TS
      else if (
        (lang === 'javascript' ||
          lang === 'typescript' ||
          lang === 'react native') &&
        /^console\.log\s*\(/.test(trimLine)
      ) {
        printContent = trimLine.match(/^console\.log\s*\((.*)\)/)?.[1] || '';
      }
      // JAVA
      else if (lang === 'java' && trimLine.includes('System.out.println')) {
        printContent =
          trimLine.match(/System\.out\.println\s*\((.*)\)/)?.[1] || '';
      }
      // C#
      else if (lang === 'csharp' && trimLine.includes('Console.WriteLine')) {
        printContent =
          trimLine.match(/Console\.WriteLine\s*\((.*)\)/)?.[1] || '';
      }
      // GO
      else if (lang === 'go' && trimLine.includes('fmt.Println')) {
        printContent = trimLine.match(/fmt\.Println\s*\((.*)\)/)?.[1] || '';
      }
      // RUST
      else if (lang === 'rust' && trimLine.includes('println!')) {
        const raw = trimLine.match(/println!\s*\((.*)\)/)?.[1] || '';
        if (raw.includes(',')) {
          const parts = raw.split(',');
          const fmt = parts[0].replace(/"/g, '');
          const variable = parts[1].trim();
          if (fmt.includes('{}') && this.variables.has(variable)) {
            printContent = fmt.replace('{}', this.variables.get(variable)!);
          } else {
            printContent = raw;
          }
        } else {
          printContent = raw;
        }
      }
      // CPP
      else if (
        (lang === 'cpp' || lang === 'c++') &&
        (trimLine.startsWith('cout') || trimLine.startsWith('std::cout'))
      ) {
        const parts = trimLine.split('<<');
        if (parts.length > 1) {
          let content = parts[1].trim();
          if (content.includes('<<')) content = content.split('<<')[0].trim();
          printContent = content.replace(';', '');
        }
      }
      // RUBY
      else if (lang === 'ruby' && /^puts\s+/.test(trimLine)) {
        printContent = trimLine.replace(/^puts\s+/, '');
      }
      // PHP
      else if (lang === 'php' && /^echo\s+/.test(trimLine)) {
        printContent = trimLine.replace(/^echo\s+/, '').replace(';', '');
      }

      if (printContent !== null) {
        let clean = printContent.trim();
        if (clean.endsWith(';')) clean = clean.slice(0, -1);

        if (
          (clean.startsWith('"') && clean.endsWith('"')) ||
          (clean.startsWith("'") && clean.endsWith("'"))
        ) {
          output.push(clean.slice(1, -1));
        } else if (this.variables.has(clean)) {
          output.push(this.variables.get(clean)!);
        } else if (
          clean.startsWith('$') &&
          this.variables.has(clean.substring(1))
        ) {
          output.push(this.variables.get(clean.substring(1))!);
        } else if (/^[\d+\-*/\s().]+$/.test(clean)) {
          try {
            // eslint-disable-next-line no-eval
            output.push(String(eval(clean)));
          } catch {
            output.push(clean);
          }
        } else {
          output.push(clean.replace(/^["']|["']$/g, ''));
        }
      }
    });

    return output;
  }
}

// -----------------------------------------------------------------------------
// 4. MAIN COMPONENT LOGIC
// -----------------------------------------------------------------------------

export function CodeEmulator({
  language,
  code: initialCode,
  expectedOutput,
  hint,
  onComplete,
}: CodeEmulatorProps & { hint?: string }) {
  // --- STATE MANAGEMENT ---
  const [sourceCode, setSourceCode] = useState(initialCode);
  const [status, setStatus] = useState<'IDLE' | 'COMPILING' | 'EXECUTING'>(
    'IDLE',
  );
  const [logs, setLogs] = useState<string[]>([]);
  const [validationResult, setValidationResult] = useState<
    'success' | 'fail' | null
  >(null);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Refs
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // --- CONFIGURATION ---
  // Normalize Language input to KernelType
  const normalizedLang = (language || 'javascript').toLowerCase() as KernelType;
  // Get helpers, defaulting to javascript if not found
  const helpers =
    SYNTAX_HELPERS[normalizedLang] || SYNTAX_HELPERS['javascript'];

  // Reset state when task changes
  useEffect(() => {
    setSourceCode(initialCode);
    setLogs([]);
    setValidationResult(null);
    setIsConsoleOpen(false);
    setStatus('IDLE');
    setShowHint(false);
  }, [initialCode]);

  // --- HELPERS ---
  const handleInsertHelper = (text: string) => {
    Keyboard.dismiss();
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

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(sourceCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const toggleHint = () => {
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowHint(!showHint);
  };

  /**
   * 🚀 EXECUTION CORE
   */
  const handleExecution = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();

    // 1. UI State Update
    setStatus('COMPILING');
    setIsConsoleOpen(true);
    setValidationResult(null);
    setLogs([]);

    // 2. Simulate Compile/Build Delay
    const isCompiled = [
      'rust',
      'go',
      'java',
      'cpp',
      'csharp',
      'kotlin',
      'swift',
    ].includes(normalizedLang);
    const delay = isCompiled ? 1200 : 600;

    setTimeout(() => {
      setStatus('EXECUTING');
      let buffer: string[] = [];
      let success = true;

      // 3. BOOTSTRAP MESSAGES
      switch (normalizedLang) {
        case 'python':
          buffer.push('Python 3.10.0 [GCC 11.2.0] on linux');
          buffer.push('>>> python3 main.py');
          break;
        case 'javascript':
          buffer.push('v18.16.0');
          buffer.push('> node index.js');
          break;
        case 'typescript':
          buffer.push('> tsc main.ts');
          buffer.push('> node main.js');
          break;
        case 'go':
          buffer.push('> go mod init playground');
          buffer.push('> go build -o main .');
          buffer.push('> ./main');
          break;
        case 'rust':
          buffer.push('   Compiling playground v0.1.0 (/playground)');
          buffer.push(
            '    Finished dev [unoptimized + debuginfo] target(s) in 0.65s',
          );
          buffer.push('     Running `target/debug/playground`');
          break;
        case 'java':
          buffer.push('> javac Main.java');
          buffer.push('> java Main');
          break;
        case 'cpp':
          buffer.push('> g++ -std=c++17 -o main main.cpp');
          buffer.push('> ./main');
          break;
        case 'csharp':
          buffer.push('MSBuild version 17.6.3+07e294721 for .NET');
          buffer.push('> dotnet run');
          break;
        case 'kotlin':
          buffer.push('> kotlinc main.kt -include-runtime -d main.jar');
          buffer.push('> java -jar main.jar');
          break;
        case 'ruby':
          buffer.push('ruby 3.2.2 [x86_64-linux]');
          buffer.push('> ruby main.rb');
          break;
        case 'php':
          buffer.push('PHP 8.2.8 (cli) (NTS)');
          buffer.push('> php main.php');
          break;
        case 'swift':
          buffer.push('Welcome to Swift version 5.8.1');
          buffer.push('> swift main.swift');
          break;
        case 'sql':
          buffer.push('SQLite version 3.39.3 2022-09-05');
          buffer.push('sqlite> -- Executing Query');
          break;
        case 'dart':
          buffer.push('Dart SDK version: 3.0.0 (stable)');
          buffer.push('> dart run main.dart');
          break;
        case 'r':
          buffer.push('R version 4.3.0 (2023-04-21)');
          buffer.push('> Rscript main.R');
          break;
        case 'bash':
          buffer.push('GNU bash, version 5.1.16');
          buffer.push('$ ./script.sh');
          break;
        case 'react native':
          buffer.push('React Native v0.72.0');
          buffer.push('> expo start --android');
          break;
      }

      // 4. RUN ENGINE DELEGATION
      try {
        if (normalizedLang === 'sql') {
          const sql = new SqlEngine();
          const res = sql.execute(sourceCode);
          buffer = [...buffer, ...res];
        } else {
          const interp = new MultiLangInterpreter();
          const res = interp.execute(sourceCode, normalizedLang);

          if (res.length === 0) {
            // Heuristic fallback for non-printing code
            const hasPrintIntent =
              sourceCode.includes('print') ||
              sourceCode.includes('log') ||
              sourceCode.includes('cout') ||
              sourceCode.includes('fmt');
            if (hasPrintIntent) {
              // Try to extract literals if engine failed
              const strMatch = sourceCode.match(/["']([^"']+)["']/);
              if (strMatch && strMatch[1].length > 1) {
                buffer.push(strMatch[1]);
              } else {
                buffer.push('(No Output generated - check syntax)');
              }
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

      if (normalizedLang !== 'sql') {
        buffer.push(`\nProcess finished with exit code ${success ? 0 : 1}`);
      }

      setLogs(buffer);
      setStatus('IDLE');

      // 6. OUTPUT VALIDATION (ENHANCED)
      const outputStr = buffer.join('\n').toLowerCase().trim();
      const expectedStr = (expectedOutput || '').trim().toLowerCase();
      // Normalize user code: remove extra spaces/newlines for comparison
      const codeStr = sourceCode.replace(/\s+/g, ' ').trim().toLowerCase();

      let passed = false;

      if (!expectedOutput) {
        passed = true; // Sandbox mode
      } else {
        if (normalizedLang === 'sql') {
          // SQL Validation:
          // 1. Output matches expected (Result Table)
          // 2. OR User Code contains expected statement (Code Match)
          // 3. OR "Query OK" + Empty expectation (Action Match)
          passed =
            outputStr.includes(expectedStr) ||
            codeStr.includes(expectedStr) ||
            (expectedStr === '' && outputStr.includes('query ok'));
        } else {
          // General Code Validation: Output must match expectation
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

  // --- UI RENDER ---
  return (
    <View style={styles.container}>
      {/* 1. HINT OVERLAY */}
      {showHint && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}>
          <TouchableWithoutFeedback onPress={() => setShowHint(false)}>
            <View
              style={[
                styles.modalOverlay,
                { backgroundColor: 'rgba(0,0,0,0.7)' },
              ]}
            >
              <TouchableWithoutFeedback>
                <Animated.View
                  entering={FadeInDown.springify().damping(15)}
                  style={styles.hintCardWrapper}
                >
                  <View
                    style={[
                      styles.hintGlassCard,
                      {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)', // Solid dark background
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                        overflow: 'hidden',
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[
                        'rgba(99, 102, 241, 0.15)',
                        'rgba(15, 23, 42, 0.85)',
                      ]}
                      style={styles.hintGradient}
                    >
                      <View style={styles.hintHeader}>
                        <View style={styles.hintTitleRow}>
                          <HandHelping size={18} color={THEME.gold} />
                          <Text style={styles.hintTitle}>Mentor Guide</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setShowHint(false)}
                          style={styles.closeBtn}
                        >
                          <XCircle size={18} color={THEME.slate} />
                        </TouchableOpacity>
                      </View>

                      <ScrollView
                        style={{ maxHeight: 200 }}
                        indicatorStyle="white"
                      >
                        <Text style={styles.hintText}>
                          {hint ||
                            'Check the lesson content above. The answer is hidden in the syntax examples!'}
                        </Text>
                      </ScrollView>

                      <View style={styles.hintFooter}>
                        <Text style={styles.hintSub}>
                          Tip: Check your syntax carefully.
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </View>
      )}

      {/* TOOLBAR */}
      <LinearGradient
        colors={[THEME.surface, '#1e293b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
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
            {normalizedLang === 'sql' ? (
              <Database size={12} color={THEME.indigo} />
            ) : (
              <Cpu size={12} color={THEME.indigo} />
            )}
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
          <TouchableOpacity
            onPress={toggleHint}
            style={[
              styles.iconButton,
              {
                backgroundColor: showHint
                  ? 'rgba(251, 191, 36, 0.15)'
                  : 'rgba(255,255,255,0.03)',
              },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <HandHelping
              size={14}
              color={showHint ? THEME.gold : THEME.slate}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={copyToClipboard} style={styles.iconButton}>
            <Copy size={14} color={THEME.slate} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearLogs} style={styles.iconButton}>
            <Trash2 size={14} color={THEME.slate} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSourceCode(initialCode);
              setLogs([]);
              setValidationResult(null);
            }}
            style={styles.iconButton}
          >
            <RefreshCcw size={14} color={THEME.slate} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* EDITOR */}
      <View style={styles.editor}>
        <View style={styles.gutter}>
          {Array.from({ length: 15 }).map((_, i) => (
            <Text key={i} style={styles.lineNum}>
              {i + 1}
            </Text>
          ))}
        </View>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
          ]}
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Hash size={12} color={THEME.slate} style={{ marginRight: 6 }} />
          <Text style={styles.syntaxLabel}>QUICK:</Text>
        </View>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        >
          {helpers.map((t, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => handleInsertHelper(t)}
              style={styles.chip}
              activeOpacity={0.7}
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
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Terminal size={12} color={THEME.slate} />
              <Text style={styles.consoleTitle}>TERMINAL OUTPUT</Text>
            </View>
            <TouchableOpacity onPress={() => setIsConsoleOpen(false)}>
              <Minimize2 size={14} color={THEME.slate} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.logScroll}
            nestedScrollEnabled
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {logs.length === 0 ? (
              <Text
                style={{
                  color: THEME.slate,
                  fontSize: 12,
                  fontStyle: 'italic',
                }}
              >
                Waiting for execution...
              </Text>
            ) : (
              logs.map((log, i) => (
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
                      fontFamily:
                        Platform.OS === 'ios' ? 'Courier' : 'monospace',
                      color: '#cbd5e1',
                      fontSize: 11,
                    },
                  ]}
                >
                  {log}
                </Text>
              ))
            )}

            {validationResult && (
              <Animated.View
                entering={FadeInDown.springify()}
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

      {/* FOOTER */}
      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {normalizedLang === 'sql' ? (
            <Database size={14} color={THEME.slate} />
          ) : (
            <Code2 size={14} color={THEME.slate} />
          )}
          <Text style={styles.footerText}>
            main.{normalizedLang === 'sql' ? 'sql' : 'txt'}
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

// -----------------------------------------------------------------------------
// 5. STYLESHEET
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.obsidian,
    overflow: 'hidden',
    marginTop: 24,
    minHeight: 480,
    width: '100%',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    pointerEvents: 'auto',
  },
  hintCardWrapper: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    backgroundColor: 'transparent',
    shadowColor: '#803e01',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  hintGlassCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  hintGradient: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  hintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 12,
  },
  hintTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hintTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fbbf24',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  closeBtn: { padding: 4 },
  hintText: {
    fontSize: 15,
    color: '#e2e8f0',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hintFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  hintSub: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    fontWeight: '500',
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
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  langBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  langText: {
    color: THEME.indigo,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  statusText: {
    color: THEME.slate,
    fontSize: 10,
    fontWeight: 'bold',
    opacity: 0.8,
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
  },
  editor: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: THEME.editorBg,
    minHeight: 220,
  },
  gutter: {
    width: 40,
    paddingVertical: 16,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  lineNum: {
    color: 'rgba(148, 163, 184, 0.25)',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 22,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    color: THEME.codeColor,
    fontSize: 13,
    lineHeight: 22,
    padding: 16,
    textAlignVertical: 'top',
    height: '100%',
  },
  syntaxBar: {
    height: 48,
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
    marginRight: 10,
    opacity: 0.7,
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
    height: 240,
    backgroundColor: '#020617',
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  consoleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
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
    marginTop: 20,
    marginBottom: 20,
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
  resultText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  footer: {
    height: 64,
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  footerText: {
    color: THEME.slate,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  runText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
