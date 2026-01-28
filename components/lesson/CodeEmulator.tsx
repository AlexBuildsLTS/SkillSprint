import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Play,
  RefreshCcw,
  Activity,
  Terminal,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const THEME = {
  bg: '#020617',
  tool: '#0f172a',
  ed: '#050a18',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  indigo: '#6366f1',
  slate: '#64748b',
  white: '#ffffff',
  border: 'rgba(255,255,255,0.06)',
};

interface EmulatorProps {
  language: string;
  code: string;
  expectedOutput?: string; // FROM DATABASE (e.g. "ARCADE_INITIALIZED")
  onComplete: () => void;
}

export function CodeEmulator({ language = 'python', code = '', expectedOutput, onComplete }: EmulatorProps) {
  const [boot, setBoot] = useState(false);
  const [status, setStatus] = useState('IDLE');
  const [logs, setLogs] = useState<string[]>([]);
  const [validation, setValidation] = useState<'success' | 'fail' | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);

  // EXECUTION ENGINE
  const runCode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatus('RUNNING...');
    setBoot(true);
    setValidation(null);

    // Simulate Execution Delay
    setTimeout(() => {
      const output: string[] = [];
      const lang = language.toLowerCase();
      
      // 1. Language Header
      if (lang.includes('python')) output.push('> python3 main.py');
      else if (lang.includes('java')) output.push('> javac Main.java && java Main');
      else output.push('> node index.js');

      // 2. PARSER: Extract Output from User Code
      let actualOutput = "";
      
      // Heuristic 1: print("Value") or console.log("Value")
      const printMatch = code.match(/(?:print|console\.log)\s*\(\s*["'](.*?)["']\s*\)/);
      
      // Heuristic 2: Variable printing (e.g. print(user.name))
      const variableMatch = code.match(/(?:print|console\.log)\s*\(\s*(\w+\.?\w*)\s*\)/);

      if (printMatch) {
        actualOutput = printMatch[1];
        output.push(actualOutput);
      } else if (variableMatch) {
         // Mock variable resolution for specific lesson cases
         if (code.includes('User("Admin")')) actualOutput = "Admin";
         else if (code.includes('ARCADE_INITIALIZED')) actualOutput = "ARCADE_INITIALIZED";
         else actualOutput = "undefined";
         
         output.push(actualOutput);
      } else {
        output.push("No standard output detected.");
      }

      output.push(`Process finished with exit code 0`);
      setLogs(output);
      setStatus('IDLE');

      // 3. VALIDATION: Compare Actual vs Expected (from DB)
      if (expectedOutput) {
        // Normalize strings to avoid whitespace errors
        const cleanExpected = expectedOutput.replace(/"/g, '').trim();
        const cleanActual = actualOutput.trim();

        if (cleanActual === cleanExpected) {
          setValidation('success');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(onComplete, 1200); // Trigger success after delay
        } else {
          setValidation('fail');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } else {
        // If no expectation, just pass (Playground mode)
        setValidation('success');
      }

    }, 800);
  };

  const reset = () => {
    setBoot(false);
    setStatus('IDLE');
    setValidation(null);
  };

  return (
    <View style={styles.frame}>
      {/* HEADER */}
      <View style={styles.tool}>
        <View style={{flexDirection:'row', alignItems:'center', gap: 8}}>
            <Terminal size={14} color={THEME.slate} />
            <Text style={styles.tabL}>
                {status === 'IDLE' ? `${language} @ env` : 'executing...'}
            </Text>
        </View>
        <TouchableOpacity onPress={reset} style={{ padding: 4 }}>
          <RefreshCcw size={14} color={THEME.slate} />
        </TouchableOpacity>
      </View>

      {/* TERMINAL / EDITOR */}
      <View style={styles.viewport}>
        {!boot ? (
          <ScrollView style={styles.ed} contentContainerStyle={{ paddingBottom: 20 }}>
            <Text style={styles.cText}>{code || '// No code provided'}</Text>
          </ScrollView>
        ) : (
          <Animated.View entering={FadeInDown} style={{ flex: 1, padding: 16 }}>
            {logs.map((line, i) => (
              <Text key={i} style={[
                styles.logText, 
                i === 0 ? { color: THEME.success } : { color: THEME.white }
              ]}>
                {line}
              </Text>
            ))}
            
            {/* VALIDATION STATUS BAR */}
            {validation === 'success' && (
                <View style={[styles.statusBox, { borderColor: THEME.success, backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                    <CheckCircle2 size={16} color={THEME.success} />
                    <Text style={{color: THEME.success, fontWeight:'900', fontSize:12}}>PASSED: Output matches expectation.</Text>
                </View>
            )}
            {validation === 'fail' && (
                <View style={[styles.statusBox, { borderColor: THEME.danger, backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                    <XCircle size={16} color={THEME.danger} />
                    <Text style={{color: THEME.danger, fontWeight:'900', fontSize:12}}>FAILED: Expected &ldquo;{expectedOutput}&ldquo;</Text>
                </View>
            )}
          </Animated.View>
        )}
      </View>

      {/* FOOTER CONTROLS */}
      <View style={styles.act}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <Activity size={12} color={status !== 'IDLE' ? THEME.success : THEME.slate} />
            <Text style={styles.statL}>{status}</Text>
        </View>
        <TouchableOpacity
          style={[styles.runB, status !== 'IDLE' && { opacity: 0.5 }]}
          onPress={runCode}
          disabled={status !== 'IDLE'}
        >
          <LinearGradient
            colors={status === 'IDLE' ? ['#6366f1', '#4338ca'] : ['#1e293b', '#0f172a']}
            style={styles.runG}
          >
            {status !== 'IDLE' ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Play size={12} color="white" fill="white" />
                <Text style={styles.runT}>EXECUTE</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: THEME.border, backgroundColor: '#020617', marginTop: 10, height: 350 },
  tool: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.tool, height: 36, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: THEME.border },
  tabL: { color: THEME.slate, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'lowercase' },
  viewport: { flex: 1, backgroundColor: '#050a18' },
  ed: { flex: 1, padding: 16 },
  cText: { color: '#a5b4fc', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, lineHeight: 22 },
  logText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, marginBottom: 6 },
  act: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: THEME.tool, borderTopWidth: 1, borderTopColor: THEME.border },
  statL: { color: THEME.slate, fontSize: 10, fontWeight: '900' },
  runB: { width: 90, height: 32, borderRadius: 6, overflow: 'hidden' },
  runG: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  runT: { color: 'white', fontWeight: '900', fontSize: 10 },
  statusBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, borderWidth: 1, marginTop: 15 },
});