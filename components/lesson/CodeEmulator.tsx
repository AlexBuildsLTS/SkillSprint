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
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import {
  Play,
  RefreshCcw,
  Terminal,
  CheckCircle2,
  XCircle,
  Activity,
  Cpu,
  Code2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * 🎨 THEME CONFIGURATION
 * Centralized palette for consistent "Obsidian/Glass" aesthetic.
 */
const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  success: '#10b981',
  danger: '#ef4444',
  slate: '#64748b',
  border: 'rgba(255,255,255,0.08)',
  surface: '#0f172a',
  editorBg: '#050a18',
  codeColor: '#a5b4fc', // Light Indigo for code text
  white: '#FFFFFF',
};

/**
 * 🛠️ INTERFACE DEFINITIONS
 * Strict typing for component props to ensure stability.
 */
interface CodeEmulatorProps {
  language: string;        // Target language (e.g., 'python', 'java', 'rust')
  code: string;            // Initial starter code snippet
  expectedOutput?: string; // Optional: Exact string match for validation
  onComplete: () => void;  // Callback when code executes successfully
}

/**
 * 🖥️ COMPONENT: CODE EMULATOR
 * A sophisticated, interactive code editor simulation.
 * Features:
 * - Real-time typing
 * - Language-specific kernel simulation (Java, Python, Rust, Node)
 * - Output parsing regex for print statements
 * - Haptic feedback integration
 */
export function CodeEmulator({
  language,
  code: initialCode,
  expectedOutput,
  onComplete,
}: CodeEmulatorProps) {
  // --- STATE MANAGEMENT ---
  const [sourceCode, setSourceCode] = useState(initialCode); // User's editable code
  const [status, setStatus] = useState<'IDLE' | 'COMPILING' | 'EXECUTING'>('IDLE');
  const [logs, setLogs] = useState<string[]>([]);
  const [validationResult, setValidationResult] = useState<'success' | 'fail' | null>(null);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  // --- REFS ---
  // Used to manage focus or scroll positions if needed in complex scenarios
  const inputRef = useRef<TextInput>(null);

  /**
   * 🔄 EFFECT: RESET ON NEW TASK
   * When the parent component passes a new initialCode (new task),
   * we must reset the internal state to avoid stale data.
   */
  useEffect(() => {
    setSourceCode(initialCode);
    setLogs([]);
    setValidationResult(null);
    setIsConsoleOpen(false);
    setStatus('IDLE');
  }, [initialCode]);

  /**
   * 🧠 CORE LOGIC: RUN CODE
   * Simulates the compilation and execution pipeline of a real IDE.
   */
  const handleExecution = useCallback(() => {
    // 1. UI FEEDBACK
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Keyboard.dismiss();
    setStatus('COMPILING');
    setIsConsoleOpen(true);
    setValidationResult(null);
    setLogs([]);

    // 2. SIMULATED RUNTIME DELAY
    // We use a timeout to mimic server latency/compilation time.
    setTimeout(() => {
      setStatus('EXECUTING');
      
      const outputBuffer: string[] = [];
      const lang = (language || 'javascript').toLowerCase();

      // --- KERNEL SIMULATION LAYER ---
      // Inject fake system commands to make it feel authentic
      if (lang.includes('java')) {
        outputBuffer.push('> javac Main.java');
        outputBuffer.push('> java Main');
      } else if (lang.includes('python')) {
        outputBuffer.push(`> python3 main.py --verbose`);
      } else if (lang.includes('rust')) {
        outputBuffer.push('> cargo build --release');
        outputBuffer.push('> target/release/main');
      } else if (lang.includes('go')) {
        outputBuffer.push('> go run main.go');
      } else {
        outputBuffer.push('> node index.js');
      }

      // --- PARSING ENGINE ---
      // We parse the user's *actual* input (sourceCode) to find print statements.
      // This allows the user to type `print("Hello")` and actually see "Hello" in the output.
      
      // Variable Storage for simple variable resolution
      const varMap = new Map<string, string>();
      
      // Pass 1: Scan for variable assignments
      sourceCode.split('\n').forEach((line) => {
        // Matches patterns like: x = 5, let x = "hi", int x = 10
        const assignmentMatch = line.match(
          /(?:let|const|var|int|String|float|bool)?\s*(\w+)\s*(?::=|=)\s*(.*);?$/
        );
        if (assignmentMatch) {
          const varName = assignmentMatch[1];
          // Remove quotes and semicolons from value
          const varValue = assignmentMatch[2].trim().replace(/['";]/g, '');
          varMap.set(varName, varValue);
        }
      });

      // Pass 2: Scan for Print Statements
      let calculatedOutput = '';
      
      // Regex library for different languages
      const printPatterns = [
        /System\.out\.println\s*\(\s*(.*?)\s*\)/, // Java
        /fmt\.Println\s*\(\s*(.*?)\s*\)/,         // Go
        /print\s*\(\s*f?["']?(.*?)["']?\s*\)/,     // Python
        /console\.log\s*\(\s*(.*?)\s*\)/,          // JS/TS
        /println!\s*\(\s*["']?(.*?)["']?\s*\)/,    // Rust
      ];

      for (const pattern of printPatterns) {
        const match = sourceCode.match(pattern);
        if (match) {
          const rawContent = match[1].trim();
          
          // Check if it's a literal string (starts with quotes)
          if (rawContent.startsWith('"') || rawContent.startsWith("'")) {
            calculatedOutput = rawContent.replace(/['"]/g, '');
          } 
          // Check if it's a known variable
          else if (varMap.has(rawContent)) {
            calculatedOutput = varMap.get(rawContent) || '';
          } 
          // Fallback: Just print raw content (e.g. numbers)
          else {
            calculatedOutput = rawContent;
          }
          break; // Stop after finding the first print statement (simplification)
        }
      }

      // --- RESULT VALIDATION ---
      if (calculatedOutput) {
        outputBuffer.push(calculatedOutput);
      } else {
        outputBuffer.push('Process finished with exit code 0');
      }

      setLogs(outputBuffer);
      setStatus('IDLE');

      // Check against Expected Output (if provided)
      // We normalize strings to avoid whitespace issues
      const normalizedCalc = calculatedOutput.trim().toLowerCase();
      const normalizedExp = (expectedOutput || '').trim().toLowerCase();

      // If no expected output is strictly defined, any valid run is a success
      // If expected output IS defined, we enforce a match.
      const isSuccess = expectedOutput 
        ? normalizedCalc.includes(normalizedExp) 
        : true; 

      if (isSuccess) {
        setValidationResult('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Trigger completion callback after short delay for user to read output
        setTimeout(onComplete, 1500);
      } else {
        setValidationResult('fail');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

    }, 1200); // 1.2s simulation time
  }, [sourceCode, language, expectedOutput, onComplete]);

  /**
   * 🔄 LOGIC: RESET EMULATOR
   * Clears the console and reverts code to the initial state.
   */
  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSourceCode(initialCode);
    setLogs([]);
    setValidationResult(null);
    setIsConsoleOpen(false);
  };

  // --- RENDER ---
  return (
    <View style={styles.emulatorContainer}>
      
      {/* 1. TOOLBAR */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          <View style={styles.langBadge}>
            <Cpu size={12} color={THEME.indigo} />
            <Text style={styles.langText}>{language?.toUpperCase() || 'SCRIPT'}</Text>
          </View>
          <Text style={styles.statusText}>
            {status === 'IDLE' ? 'READY' : status === 'COMPILING' ? 'COMPILING...' : 'RUNNING...'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleReset} style={styles.iconButton}>
          <RefreshCcw size={14} color={THEME.slate} />
        </TouchableOpacity>
      </View>

      {/* 2. EDITOR VIEWPORT */}
      <View style={styles.editorViewport}>
        <View style={styles.lineNumbers}>
          {[1,2,3,4,5,6].map(n => (
            <Text key={n} style={styles.lineNum}>{n}</Text>
          ))}
        </View>
        <TextInput
          ref={inputRef}
          style={styles.codeInput}
          value={sourceCode}
          onChangeText={setSourceCode}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          textAlignVertical="top"
          placeholder="// Write your code here..."
          placeholderTextColor="rgba(165, 180, 252, 0.3)"
        />
      </View>

      {/* 3. CONSOLE OUTPUT (Animated Expansion) */}
      {isConsoleOpen && (
        <Animated.View 
          layout={Layout.springify()} 
          entering={FadeInUp.duration(300)}
          style={styles.consoleContainer}
        >
          <View style={styles.consoleHeader}>
            <Terminal size={12} color={THEME.slate} />
            <Text style={styles.consoleTitle}>TERMINAL OUTPUT</Text>
          </View>
          <ScrollView style={styles.logsScroll} nestedScrollEnabled>
            {logs.map((log, i) => (
              <Text 
                key={i} 
                style={[
                  styles.logText, 
                  // Highlight the actual output line (usually the last one before exit code)
                  (i === logs.length - 1 && log !== 'Process finished with exit code 0') && { color: THEME.white, fontWeight: 'bold' }
                ]}
              >
                {log}
              </Text>
            ))}
            
            {/* Validation Badge */}
            {validationResult && (
              <Animated.View entering={FadeInDown} style={[
                styles.resultBadge,
                validationResult === 'success' ? styles.badgeSuccess : styles.badgeFail
              ]}>
                {validationResult === 'success' ? (
                  <CheckCircle2 size={16} color={THEME.success} />
                ) : (
                  <XCircle size={16} color={THEME.danger} />
                )}
                <Text style={[
                  styles.resultText,
                  { color: validationResult === 'success' ? THEME.success : THEME.danger }
                ]}>
                  {validationResult === 'success' ? 'TEST PASSED' : 'OUTPUT MISMATCH'}
                </Text>
              </Animated.View>
            )}
          </ScrollView>
        </Animated.View>
      )}

      {/* 4. EXECUTION BAR */}
      <View style={styles.executionBar}>
        <View style={styles.executionInfo}>
          <Code2 size={14} color={THEME.slate} />
          <Text style={styles.infoText}>main.{language === 'python' ? 'py' : 'js'}</Text>
        </View>

        <TouchableOpacity
          disabled={status !== 'IDLE'}
          onPress={handleExecution}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={status === 'IDLE' ? [THEME.indigo, '#4f46e5'] : ['#334155', '#1e293b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.runButton}
          >
            {status !== 'IDLE' ? (
              <ActivityIndicator size="small" color={THEME.white} />
            ) : (
              <>
                <Text style={styles.runButtonText}>RUN CODE</Text>
                <Play size={12} color={THEME.white} fill={THEME.white} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

    </View>
  );
}

/**
 * 💅 STYLESHEET
 * High-performance styles tailored for the obsidian dark theme.
 */
const styles = StyleSheet.create({
  emulatorContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.obsidian,
    overflow: 'hidden',
    marginTop: 20,
    minHeight: 320, // Ensure decent height for typing
  },

  // TOOLBAR
  toolbar: {
    height: 44,
    backgroundColor: THEME.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  toolbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  langBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  langText: { 
    color: THEME.indigo, 
    fontSize: 10, 
    fontWeight: '900', 
    letterSpacing: 1 
  },
  statusText: { color: THEME.slate, fontSize: 10, fontWeight: 'bold' },
  iconButton: { padding: 4 },

  // EDITOR
  editorViewport: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: THEME.editorBg,
    minHeight: 180,
  },
  lineNumbers: {
    width: 32,
    paddingVertical: 16,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.03)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  lineNum: {
    color: 'rgba(148, 163, 184, 0.4)',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 22, // Must match text input line height
  },
  codeInput: {
    flex: 1,
    color: THEME.codeColor,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 22,
    padding: 16,
    textAlignVertical: 'top',
  },

  // CONSOLE
  consoleContainer: {
    height: 160,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  consoleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  consoleTitle: { color: THEME.slate, fontSize: 10, fontWeight: 'bold' },
  logsScroll: { flex: 1, padding: 16 },
  logText: {
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    marginBottom: 4,
  },
  
  // RESULT BADGES
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' },
  badgeFail: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' },
  resultText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  // FOOTER
  executionBar: {
    height: 56,
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  executionInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { color: THEME.slate, fontSize: 12, fontWeight: '600' },
  
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  runButtonText: { color: 'white', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
});