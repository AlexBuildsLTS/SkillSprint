import React, { useState, useCallback } from 'react';
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
  Terminal,
  CheckCircle2,
  XCircle,
  Activity,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  success: '#10b981',
  danger: '#ef4444',
  slate: '#64748b',
  border: 'rgba(255,255,255,0.06)',
};

interface CodeEmulatorProps {
  language: string;
  code: string;
  expectedOutput?: string;
  onComplete: () => void;
}

export function CodeEmulator({
  language,
  code,
  expectedOutput,
  onComplete,
}: CodeEmulatorProps) {
  const [status, setStatus] = useState('IDLE');
  const [logs, setLogs] = useState<string[]>([]);
  const [validation, setValidation] = useState<'success' | 'fail' | null>(null);
  const [booted, setBooted] = useState(false);

  const runCode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setStatus('VIRTUALIZING...');
    setValidation(null);
    setBooted(true);

    setTimeout(() => {
      const output: string[] = [];
      const lang = (language || '').toLowerCase();

      // 1. DYNAMIC KERNEL SWITCHING
      if (lang.includes('java')) {
        output.push('> javac Main.java && java Main');
      } else if (lang.includes('python')) {
        output.push('> python3 main.py');
      } else if (lang.includes('rust')) {
        output.push('> cargo run --quiet');
      } else {
        output.push('> node index.js');
      }

      // 2. UNIVERSAL VARIABLE PARSER
      const varMap = new Map<string, string>();
      code.split('\n').forEach((line) => {
        const assignment = line.match(
          /(?:let|const|var|int|String|float|bool)?\s*(\w+)\s*(?::=|=)\s*(.*);?$/,
        );
        if (assignment) {
          const val = assignment[2].trim().replace(/['";]/g, '');
          varMap.set(assignment[1], val);
        }
      });

      // 3. MULTI-LANGUAGE OUTPUT PARSER
      let actualOutput = '';
      const patterns = [
        /System\.out\.println\s*\(\s*(.*?)\s*\)/, // Java
        /print\s*\(\s*f?["']?(.*?)["']?\s*\)/, // Python
        /console\.log\s*\(\s*(.*?)\s*\)/, // JS
        /println!\s*\(\s*["']?(.*?)["']?\s*\)/, // Rust
      ];

      for (const p of patterns) {
        const m = code.match(p);
        if (m) {
          const content = m[1].trim();
          // Resolve if content is a variable or a literal
          if (content.startsWith('"') || content.startsWith("'")) {
            actualOutput = content.replace(/['"]/g, '');
          } else {
            actualOutput = varMap.get(content) || content;
          }
          break;
        }
      }

      output.push(actualOutput || 'Process finished with no output.');
      setLogs(output);
      setStatus('IDLE');

      // 4. VALIDATION
      const cleanExp = (expectedOutput || '').trim();
      const cleanAct = actualOutput.trim();

      if (cleanExp && cleanAct === cleanExp) {
        setValidation('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onComplete();
      } else {
        setValidation('fail');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }, 1000);
  }, [code, language, expectedOutput, onComplete]);

  return (
    <View style={styles.frame}>
      <View style={styles.tool}>
        <View style={styles.toolLeft}>
          <Terminal size={14} color={THEME.slate} />
          <Text style={styles.tabL}>{language?.toUpperCase()} V-RUNTIME</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setBooted(false);
            setValidation(null);
          }}
        >
          <RefreshCcw size={14} color={THEME.slate} />
        </TouchableOpacity>
      </View>

      <View style={styles.viewport}>
        {!booted ? (
          <ScrollView style={styles.ed}>
            <Text style={styles.cText}>{code}</Text>
          </ScrollView>
        ) : (
          <Animated.View entering={FadeInDown} style={{ padding: 20 }}>
            {logs.map((line, i) => (
              <Text
                key={i}
                style={[
                  styles.logText,
                  i > 0 && { color: 'white', fontWeight: '700' },
                ]}
              >
                {line}
              </Text>
            ))}
            {validation && (
              <View
                style={[
                  styles.badge,
                  validation === 'success'
                    ? styles.successBadge
                    : styles.failBadge,
                ]}
              >
                {validation === 'success' ? (
                  <CheckCircle2 size={14} color={THEME.success} />
                ) : (
                  <XCircle size={14} color={THEME.danger} />
                )}
                <Text
                  style={
                    validation === 'success'
                      ? styles.successText
                      : styles.failText
                  }
                >
                  {validation === 'success'
                    ? 'SYSTEM_MATCH_SUCCESS'
                    : 'OUTPUT_MISMATCH'}
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.statusRow}>
          <Activity
            size={12}
            color={status === 'IDLE' ? THEME.slate : THEME.success}
          />
          <Text style={styles.statText}>{status}</Text>
        </View>
        <TouchableOpacity
          style={styles.runBtn}
          onPress={runCode}
          disabled={status !== 'IDLE'}
        >
          <LinearGradient
            colors={['#6366f1', '#4338ca']}
            style={styles.runGradient}
          >
            {status !== 'IDLE' ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Play size={12} color="white" fill="white" />
                <Text style={styles.runText}>EXECUTE</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: THEME.border,
    height: 280,
    marginTop: 15,
  },
  tool: {
    height: 40,
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  toolLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tabL: {
    color: THEME.slate,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  viewport: { flex: 1, backgroundColor: '#050a18' },
  ed: { padding: 20 },
  cText: {
    color: '#a5b4fc',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
  logText: {
    color: THEME.slate,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    marginBottom: 8,
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statText: { color: THEME.slate, fontSize: 10, fontWeight: 'bold' },
  runBtn: { width: 100, height: 34, borderRadius: 8, overflow: 'hidden' },
  runGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  runText: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 15,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  successBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: THEME.success,
  },
  failBadge: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: THEME.danger,
  },
  successText: { color: THEME.success, fontSize: 10, fontWeight: '900' },
  failText: { color: THEME.danger, fontSize: 10, fontWeight: '900' },
});
