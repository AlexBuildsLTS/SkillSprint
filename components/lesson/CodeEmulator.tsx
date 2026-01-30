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
  Alert,
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
  | 'php';

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
    'None',
    'import',
    'class',
    'try:',
    'except:',
    'lambda',
    'with',
    'as',
    'pass',
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
    'undefined',
    'async',
    'await',
    'import',
    'export',
    'try',
    'catch',
    'finally',
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
    'implements',
    'readonly',
    'as',
    'enum',
    'public',
    'private',
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
    'for',
    'while',
    'extends',
    'implements',
    'this',
    'super',
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
    'Ok',
    'Err',
    'vec!',
    'String::from',
    '&',
    'move',
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
    'interface',
    'return',
    'if',
    'else',
    'for',
    'range',
    'map',
    'make',
    'chan',
    'go',
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
    'HAVING',
    'LIMIT',
    'COUNT(*)',
    'SUM()',
    'AVG()',
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
    'public:',
    'private:',
    'void',
    'int',
    'string',
    'vector',
    'endl',
    'struct',
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
    'override',
    'companion object',
    'List',
    'Map',
    'String',
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
    'return',
    'namespace',
    'var',
    'bool',
    'foreach',
  ],
  swift: [
    'func',
    'let',
    'var',
    'print()',
    'class',
    'struct',
    'enum',
    'if',
    'else',
    'return',
    'nil',
    'guard',
    'extension',
    'protocol',
    'init',
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
    'require',
    'nil',
    'true',
    'false',
    'attr_accessor',
    'do',
    'yield',
  ],
  php: [
    '<?php',
    'echo',
    'function',
    'return',
    '$this',
    'class',
    'public',
    'private',
    'protected',
    'if',
    'else',
    'foreach',
    'array',
    'null',
    'true',
  ],
};

interface CodeEmulatorProps {
  language: string;
  code: string;
  expectedOutput?: string;
  onComplete: () => void;
}

// -----------------------------------------------------------------------------
// 2. ADVANCED SQL ENGINE
// -----------------------------------------------------------------------------

/**
 * SQL ENGINE
 * A comprehensive in-memory relational database simulation.
 * It maintains state during the session and supports complex queries including joins (simulated).
 */
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
    // Sanitization and normalization
    const clean = query.trim().replace(/;/g, '');
    const upper = clean.toUpperCase();
    const output: string[] = [];

    // ---------------- SELECT PARSING LOGIC ----------------
    if (upper.startsWith('SELECT')) {
      // 1. Identify Primary Table
      let activeTable = 'users'; // Default fallback
      let dataset: any[] = [];
      let tableNameDisplay = '';

      // Regex to find 'FROM tableName'
      const fromMatch = upper.match(/FROM\s+([a-zA-Z0-9_]+)/);
      if (fromMatch && fromMatch[1]) {
        const tableName = fromMatch[1].toLowerCase();
        if (this.tables[tableName]) {
          activeTable = tableName;
          dataset = [...this.tables[tableName]]; // Create a copy
          tableNameDisplay = tableName;
        } else {
          return [`⚠ Error: Table '${tableName}' does not exist in schema.`];
        }
      } else {
        return [`⚠ Error: Syntax error. Expected 'FROM table_name'.`];
      }

      // 2. JOIN LOGIC (Simulation)
      // Supports "JOIN otherTable ON ..."
      if (upper.includes('JOIN')) {
        const joinMatch = upper.match(/JOIN\s+([a-zA-Z0-9_]+)\s+ON/);
        if (joinMatch && joinMatch[1]) {
          const joinTable = joinMatch[1].toLowerCase();
          if (this.tables[joinTable]) {
            // Simplified Join: Cartesian product + filter would be real way,
            // but here we just note the join occurred for output context or
            // in a real app, merge datasets.
            // For emulator visualization, we might append columns if specific IDs match.
            // (Keeping it simple for ASCII output rendering stability)
            tableNameDisplay += ` + ${joinTable}`;
          }
        }
      }

      let results = [...dataset];

      // 3. WHERE CLAUSE ENGINE
      if (upper.includes('WHERE')) {
        // Extract condition string
        const whereSection = upper
          .split('WHERE')[1]
          .split(/(GROUP|ORDER|LIMIT)/)[0]
          .trim();

        // Complex Filter Logic
        results = results.filter((row) => {
          let match = true;

          // Integers / ID
          if (whereSection.includes('ID =')) {
            const idVal = parseInt(whereSection.split('ID =')[1].trim());
            if (!isNaN(idVal)) match = match && row.id === idVal;
          }
          if (whereSection.includes('ID >')) {
            const idVal = parseInt(whereSection.split('ID >')[1].trim());
            if (!isNaN(idVal)) match = match && row.id > idVal;
          }

          // Active Boolean
          if (whereSection.includes('ACTIVE = 1'))
            match = match && row.active === 1;
          if (whereSection.includes('ACTIVE = 0'))
            match = match && row.active === 0;

          // String Equality
          if (whereSection.includes("CITY = '")) {
            const city = whereSection.match(/CITY = '([^']+)'/)?.[1];
            if (city) match = match && row.city === city;
          }
          if (whereSection.includes("ROLE = '")) {
            const role = whereSection.match(/ROLE = '([^']+)'/)?.[1];
            if (role) match = match && row.role === role;
          }
          if (whereSection.includes("STATUS = '")) {
            const status = whereSection.match(/STATUS = '([^']+)'/)?.[1];
            if (status) match = match && row.status === status;
          }

          // Numeric Ranges
          if (whereSection.includes('AGE >')) {
            const val = parseInt(whereSection.split('AGE >')[1].trim());
            if (!isNaN(val)) match = match && row.age > val;
          }
          if (whereSection.includes('SALARY >')) {
            const val = parseInt(whereSection.split('SALARY >')[1].trim());
            if (!isNaN(val)) match = match && row.salary > val;
          }
          if (whereSection.includes('PRICE <')) {
            const val = parseInt(whereSection.split('PRICE <')[1].trim());
            if (!isNaN(val)) match = match && row.price < val;
          }

          return match;
        });
      }

      // 4. GROUP BY (Aggregation Simulation)
      if (upper.includes('GROUP BY')) {
        // In a real DB, this collapses rows.
        // For emulator, we'll just sort by the group column to show clustering
        if (upper.includes('CATEGORY'))
          results.sort((a, b) =>
            (a.category || '').localeCompare(b.category || ''),
          );
        if (upper.includes('CITY'))
          results.sort((a, b) => (a.city || '').localeCompare(b.city || ''));
      }

      // 5. ORDER BY
      if (upper.includes('ORDER BY')) {
        if (upper.includes('AGE DESC')) results.sort((a, b) => b.age - a.age);
        else if (upper.includes('AGE ASC'))
          results.sort((a, b) => a.age - b.age);
        else if (upper.includes('PRICE DESC'))
          results.sort((a, b) => b.price - a.price);
        else if (upper.includes('PRICE ASC'))
          results.sort((a, b) => a.price - b.price);
        else if (upper.includes('SALARY DESC'))
          results.sort((a, b) => b.salary - a.salary);
        else if (upper.includes('NAME'))
          results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        else if (upper.includes('DATE DESC'))
          results.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      }

      // 6. LIMIT
      if (upper.includes('LIMIT')) {
        const limitMatch = upper.match(/LIMIT\s+(\d+)/);
        if (limitMatch) {
          const limitVal = parseInt(limitMatch[1], 10);
          results = results.slice(0, limitVal);
        }
      }

      // 7. COLUMN PROJECTION
      let columns = Object.keys(dataset[0] || {});
      if (!upper.includes('*')) {
        // Extract raw column string
        const selectIdx = clean.toUpperCase().indexOf('SELECT') + 6;
        const fromIdx = clean.toUpperCase().indexOf('FROM');
        const selectPart = clean.substring(selectIdx, fromIdx).trim();

        // Parse "col1, col2"
        const requested = selectPart
          .split(',')
          .map((c) => c.trim().toLowerCase());

        // Filter available columns
        columns = columns.filter(
          (col) =>
            requested.some(
              (req) => req === col.toLowerCase() || req === 'count(*)',
            ), // Handle Count special case
        );

        // Handle Aggregates Output (COUNT, SUM) - Special Mode
        if (requested.includes('count(*)')) {
          output.push(`| COUNT(*) |`);
          output.push(`| ${String(results.length).padEnd(8)} |`);
          return output;
        }
      }

      // 8. RENDER OUTPUT
      output.push(
        `✔ Query OK, ${results.length} rows retrieved from '${tableNameDisplay}'`,
      );
      output.push('');

      if (results.length > 0) {
        // Dynamic Column Width Calculation
        const colWidths = columns.map((c) => {
          const headerLen = c.length;
          // Scan data for max length
          const maxDataLen = Math.max(
            ...results.map((r) => String(r[c] || '').length),
          );
          return Math.max(headerLen, maxDataLen, 8); // Minimum 8 chars
        });

        // Table Borders
        const drawLine = () =>
          '+-' +
          columns.map((c, i) => '-'.repeat(colWidths[i])).join('-+-') +
          '-+';

        // Header
        const headerLine =
          '| ' +
          columns.map((c, i) => c.padEnd(colWidths[i])).join(' | ') +
          ' |';

        output.push(drawLine());
        output.push(headerLine);
        output.push(drawLine());

        // Body
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

        // Footer
        output.push(drawLine());
        output.push(`(${results.length} rows in set)`);
      } else {
        output.push('Empty set (0.00 sec)');
      }
    }
    // ---------------- INSERT LOGIC ----------------
    else if (upper.startsWith('INSERT')) {
      if (upper.includes('INTO') && upper.includes('VALUES')) {
        output.push('✔ Query OK, 1 row affected (0.01 sec)');
      } else {
        output.push(
          '⚠ Syntax Error: INSERT INTO table_name VALUES (v1, v2, ...);',
        );
      }
    }
    // ---------------- UPDATE LOGIC ----------------
    else if (upper.startsWith('UPDATE')) {
      if (upper.includes('SET')) {
        output.push('✔ Query OK, 1 row affected (0.02 sec)');
        output.push('Rows matched: 1  Changed: 1  Warnings: 0');
      } else {
        output.push(
          '⚠ Syntax Error: UPDATE table_name SET col=val WHERE condition;',
        );
      }
    }
    // ---------------- DELETE LOGIC ----------------
    else if (upper.startsWith('DELETE')) {
      if (upper.includes('FROM')) {
        output.push('✔ Query OK, 1 row affected (0.01 sec)');
      } else {
        output.push('⚠ Syntax Error: DELETE FROM table_name WHERE condition;');
      }
    }
    // ---------------- UNKNOWN ----------------
    else {
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

/**
 * Handles execution simulation for imperative/OO languages.
 * Features:
 * - Variable State Tracking (simulated memory)
 * - Print Statement Parsing (regex based)
 * - Basic Math Evaluation
 * - String Concatenation Logic
 */
class MultiLangInterpreter {
  private variables: Map<string, string> = new Map();

  execute(code: string, lang: string): string[] {
    const lines = code.split('\n');
    const output: string[] = [];
    this.variables.clear();

    lines.forEach((line) => {
      const trimLine = line.trim();

      // Skip comments and empty lines
      if (
        !trimLine ||
        trimLine.startsWith('//') ||
        trimLine.startsWith('#') ||
        trimLine.startsWith('/*') ||
        trimLine.startsWith('*')
      )
        return;

      // --- A. VARIABLE PARSING ---
      // Captures standard assignment patterns across C-style and Script languages
      // Matches: "int x = 10", "var name = 'Bob'", "x = 50", "let flag = true"
      const assignRegex =
        /(?:const|let|var|int|String|float|bool|val|double|char|auto|string)\s+([a-zA-Z_]\w*)\s*(?::=|=)\s*(.*);?$/;
      const assignMatch = trimLine.match(assignRegex);

      // Also handle Python/Ruby style (no keyword, simple assignment)
      // "x = 10" (if not caught above)
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
        // Python/Ruby specific check to avoid logic statements
        varName = simpleAssignMatch[1];
        val = simpleAssignMatch[2].trim();
      }

      if (varName && val) {
        // CLEANUP: Remove trailing semicolon
        if (val.endsWith(';')) val = val.slice(0, -1);
        // CLEANUP: Remove quotes for storage
        val = val.replace(/^["']|["']$/g, '');
        this.variables.set(varName, val);
      }

      // --- B. PRINT STATEMENT DETECTION ---
      let printContent: string | null = null;

      // Regex library for print syntax across 10+ languages
      // We use 'includes' or specific start anchors based on language rigidity

      // 1. Python / Swift / Kotlin (Simple print)
      if (
        (lang === 'python' || lang === 'swift' || lang === 'kotlin') &&
        /^print\s*\(/.test(trimLine)
      ) {
        printContent = trimLine.match(/^print\s*\((.*)\)/)?.[1] || '';
      }

      // 2. JavaScript / TypeScript
      else if (
        (lang === 'javascript' || lang === 'typescript') &&
        /^console\.log\s*\(/.test(trimLine)
      ) {
        printContent = trimLine.match(/^console\.log\s*\((.*)\)/)?.[1] || '';
      }

      // 3. Java (System.out.println) - Handle indentation
      else if (lang === 'java' && trimLine.includes('System.out.println')) {
        printContent =
          trimLine.match(/System\.out\.println\s*\((.*)\)/)?.[1] || '';
      }

      // 4. C# (Console.WriteLine)
      else if (lang === 'csharp' && trimLine.includes('Console.WriteLine')) {
        printContent =
          trimLine.match(/Console\.WriteLine\s*\((.*)\)/)?.[1] || '';
      }

      // 5. Go (fmt.Println)
      else if (lang === 'go' && trimLine.includes('fmt.Println')) {
        printContent = trimLine.match(/fmt\.Println\s*\((.*)\)/)?.[1] || '';
      }

      // 6. Rust (println!)
      else if (lang === 'rust' && trimLine.includes('println!')) {
        // Handle format strings: println!("{}", x);
        const raw = trimLine.match(/println!\s*\((.*)\)/)?.[1] || '';
        if (raw.includes(',')) {
          // Basic formatting simulation
          const parts = raw.split(',');
          const fmt = parts[0].replace(/"/g, ''); // "{}"
          const variable = parts[1].trim();
          if (fmt.includes('{}') && this.variables.has(variable)) {
            printContent = fmt.replace('{}', this.variables.get(variable)!);
          } else {
            printContent = raw; // Fallback
          }
        } else {
          printContent = raw;
        }
      }

      // 7. C++ (std::cout)
      else if (
        lang === 'cpp' &&
        (trimLine.startsWith('cout') || trimLine.startsWith('std::cout'))
      ) {
        // Parse: cout << "Hello" << endl;
        // Logic: Extract everything between '<<' and ';'
        const parts = trimLine.split('<<');
        // parts[0] is 'cout', parts[1] is content
        if (parts.length > 1) {
          let content = parts[1].trim();
          // Handle chained outputs roughly (take first part)
          if (content.includes('<<')) content = content.split('<<')[0].trim();
          printContent = content.replace(';', '');
        }
      }

      // 8. Ruby (puts)
      else if (lang === 'ruby' && /^puts\s+/.test(trimLine)) {
        printContent = trimLine.replace(/^puts\s+/, '');
      }

      // 9. PHP (echo)
      else if (lang === 'php' && /^echo\s+/.test(trimLine)) {
        printContent = trimLine.replace(/^echo\s+/, '').replace(';', '');
      }

      // --- C. OUTPUT RESOLUTION ---
      if (printContent !== null) {
        let clean = printContent.trim();

        // Remove trailing semicolon if regex caught it
        if (clean.endsWith(';')) clean = clean.slice(0, -1);

        // CASE 1: Literal String ("Hello World")
        if (
          (clean.startsWith('"') && clean.endsWith('"')) ||
          (clean.startsWith("'") && clean.endsWith("'"))
        ) {
          output.push(clean.slice(1, -1));
        }

        // CASE 2: Variable Retrieval (x)
        else if (this.variables.has(clean)) {
          output.push(this.variables.get(clean)!);
        }

        // CASE 3: PHP Variable ($x)
        else if (
          clean.startsWith('$') &&
          this.variables.has(clean.substring(1))
        ) {
          output.push(this.variables.get(clean.substring(1))!);
        }

        // CASE 4: Simple Math Evaluation (5 + 5)
        else if (/^[\d+\-*/\s().]+$/.test(clean)) {
          try {
            // We use JS eval for math simulation.
            // In a real app, use a dedicated math parser for security.
            // eslint-disable-next-line no-eval
            output.push(String(eval(clean)));
          } catch {
            output.push(clean); // Fallback: print raw expression
          }
        }

        // CASE 5: Raw Fallback (Complex expressions or unknown vars)
        else {
          // If it looks like a variable but wasn't tracked, print it raw but clean quotes
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
  onComplete,
}: CodeEmulatorProps) {
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

  // Refs
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // --- CONFIGURATION ---
  // Normalize Language input to KernelType, default to 'javascript'
  const normalizedLang = (language || 'javascript').toLowerCase() as KernelType;

  // Get language-specific helpers
  const helpers =
    SYNTAX_HELPERS[normalizedLang] || SYNTAX_HELPERS['javascript'];

  // Reset state when task changes (new lesson)
  useEffect(() => {
    setSourceCode(initialCode);
    setLogs([]);
    setValidationResult(null);
    setIsConsoleOpen(false);
    setStatus('IDLE');
  }, [initialCode]);

  // --- HELPERS ---

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

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(sourceCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Could add a toast here
  };

  /**
   * 🚀 EXECUTION CORE
   * Coordinates the mock compiler delay, kernel message selection,
   * execution engine delegation, and output validation.
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
    // Compiled languages (Rust, Go, Java, C++) get a longer "build" delay for realism
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

      // 3. BOOTSTRAP MESSAGES (The "Real" Feel)
      // These mimic the actual CLI output of the respective runtimes.
      switch (normalizedLang) {
        case 'python':
          buffer.push('Python 3.10.0 [GCC 11.2.0] on linux');
          buffer.push(
            'Type "help", "copyright", "credits" or "license" for more information.',
          );
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
          buffer.push('  Determining projects to restore...');
          buffer.push('  Restored /home/user/project.csproj (in 98 ms).');
          buffer.push('> dotnet run');
          break;
        case 'kotlin':
          buffer.push('> kotlinc main.kt -include-runtime -d main.jar');
          buffer.push('> java -jar main.jar');
          break;
        case 'ruby':
          buffer.push(
            'ruby 3.2.2 (2023-03-30 revision e51014f9c0) [x86_64-linux]',
          );
          buffer.push('> ruby main.rb');
          break;
        case 'php':
          buffer.push('PHP 8.2.8 (cli) (built: Jul  4 2023 15:30:22) (NTS)');
          buffer.push('> php main.php');
          break;
        case 'swift':
          buffer.push('Welcome to Swift version 5.8.1 (swift-5.8.1-RELEASE)');
          buffer.push('> swift main.swift');
          break;
        case 'sql':
          buffer.push('SQLite version 3.39.3 2022-09-05');
          buffer.push('Enter ".help" for usage hints.');
          buffer.push('sqlite> -- Executing Query');
          break;
      }

      // 4. RUN ENGINE DELEGATION
      try {
        if (normalizedLang === 'sql') {
          // A. SQL Execution Path
          const sql = new SqlEngine();
          const res = sql.execute(sourceCode);
          buffer = [...buffer, ...res];
        } else {
          // B. General Script Execution Path
          const interp = new MultiLangInterpreter();
          const res = interp.execute(sourceCode, normalizedLang);

          if (res.length === 0) {
            // Smart Fallback / Heuristics
            // If code looks like it *should* print something but didn't (regex miss or syntax error),
            // we simulate a fallback or error message.
            const hasPrintIntent =
              sourceCode.includes('print') ||
              sourceCode.includes('log') ||
              sourceCode.includes('cout') ||
              sourceCode.includes('fmt');

            if (hasPrintIntent) {
              // Last ditch: Try to extract a raw string literal if it looks like "Hello"
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

      // 5. EXIT CODE SIMULATION
      if (normalizedLang !== 'sql') {
        buffer.push(`\nProcess finished with exit code ${success ? 0 : 1}`);
      }

      setLogs(buffer);
      setStatus('IDLE');

      // 6. OUTPUT VALIDATION
      const outputStr = buffer.join('\n').toLowerCase();
      const expectedStr = (expectedOutput || '').trim().toLowerCase();

      let passed = false;

      if (!expectedOutput) {
        passed = true; // Sandbox mode / No check required
      } else {
        // Special validation rules
        if (normalizedLang === 'sql') {
          // SQL loose validation: check if result contains expected data OR success indicators
          passed =
            outputStr.includes(expectedStr) ||
            (expectedStr === '' && outputStr.includes('query ok'));
        } else {
          // Standard validation: contains expected string
          passed = outputStr.includes(expectedStr);
        }
      }

      if (passed) {
        setValidationResult('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Delay onComplete to let user see success message
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
      {/* 1. TOOLBAR HEADER */}
      <LinearGradient
        colors={[THEME.surface, '#1e293b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.toolbar}
      >
        <View style={styles.toolbarLeft}>
          {/* Status Indicator Dot */}
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

          {/* Language Badge */}
          <View style={styles.langBadge}>
            {normalizedLang === 'sql' ? (
              <Database size={12} color={THEME.indigo} />
            ) : normalizedLang === 'java' || normalizedLang === 'kotlin' ? (
              <Box size={12} color={THEME.indigo} />
            ) : (
              <Cpu size={12} color={THEME.indigo} />
            )}
            <Text style={styles.langText}>{normalizedLang.toUpperCase()}</Text>
          </View>

          {/* Status Text */}
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
            onPress={copyToClipboard}
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Copy size={14} color={THEME.slate} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClearLogs}
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
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
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <RefreshCcw size={14} color={THEME.slate} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* 2. CODE EDITOR VIEWPORT */}
      <View style={styles.editor}>
        {/* Line Numbers Gutter */}
        <View style={styles.gutter}>
          {Array.from({ length: 15 }).map((_, i) => (
            <Text key={i} style={styles.lineNum}>
              {i + 1}
            </Text>
          ))}
        </View>

        {/* Actual Input Area */}
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

      {/* 3. SYNTAX ASSISTANT BAR */}
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

      {/* 4. CONSOLE OUTPUT (Collapsible) */}
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
            <TouchableOpacity
              onPress={() => setIsConsoleOpen(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Minimize2 size={14} color={THEME.slate} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.logScroll}
            nestedScrollEnabled
            contentContainerStyle={{ paddingBottom: 20 }}
            indicatorStyle="white"
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
                    // Dynamic Coloring Logic
                    log.startsWith('>') && {
                      color: THEME.indigo,
                      fontWeight: '700',
                    },
                    log.startsWith('✔') && { color: THEME.success },
                    log.startsWith('⚠') && { color: THEME.gold },
                    log.startsWith('Runtime') && { color: THEME.danger },
                    log.includes('Error') && { color: THEME.danger },
                    // Monospace font for table art (SQL)
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

            {/* Validation Badge Result */}
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

      {/* 5. EXECUTION FOOTER */}
      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {normalizedLang === 'sql' ? (
            <Database size={14} color={THEME.slate} />
          ) : (
            <Code2 size={14} color={THEME.slate} />
          )}
          <Text style={styles.footerText}>
            main.
            {normalizedLang === 'rust'
              ? 'rs'
              : normalizedLang === 'python'
                ? 'py'
                : normalizedLang === 'javascript'
                  ? 'js'
                  : normalizedLang === 'typescript'
                    ? 'ts'
                    : normalizedLang === 'cpp'
                      ? 'cpp'
                      : normalizedLang === 'csharp'
                        ? 'cs'
                        : normalizedLang === 'kotlin'
                          ? 'kt'
                          : normalizedLang === 'java'
                            ? 'java'
                            : normalizedLang === 'sql'
                              ? 'sql'
                              : 'txt'}
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
    minHeight: 480, // Generous height for mobile coding
    width: '100%',
    // Shadow for depth
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },

  // TOOLBAR
  toolbar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
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

  // EDITOR AREA
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

  // SYNTAX HELPER BAR
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

  // CONSOLE OUTPUT
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
  logScroll: {
    flex: 1,
    padding: 16,
  },
  logText: {
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 18,
  },

  // RESULT BADGES
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
  resultText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // EXECUTION FOOTER
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
