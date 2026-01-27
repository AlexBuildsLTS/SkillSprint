import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  BounceIn,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import {
  Play,
  RefreshCcw,
  Activity,
  Terminal,
  ChevronRight,
  Cpu,
  Database,
  Smartphone,
  Layers,
  Layout,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const THEME = {
  bg: '#020617',
  tool: '#0f172a',
  ed: '#050a18',
  success: '#10b981',
  warning: '#f59e0b',
  indigo: '#6366f1',
  slate: '#64748b',
  border: 'rgba(255,255,255,0.06)',
};

/** ☕ JAVA KERNEL: JVM HEAP VISUALS */
const JavaKernel = ({ onWin }: any) => {
  const [heap, setHeap] = useState(42);
  const reg = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (heap < 95) setHeap((h) => h + 12);
    else onWin();
  };
  return (
    <View style={styles.kWrap}>
      <View style={styles.kHead}>
        <Cpu size={14} color={THEME.warning} />
        <Text style={styles.kTitle}>JVM_v21_Runtime</Text>
      </View>
      <View style={styles.kBox}>
        <Text style={styles.kVal}>{heap}MB</Text>
        <Text style={styles.kLab}>Memory Heap Pool</Text>
      </View>
      <TouchableOpacity
        style={[styles.kBtn, { backgroundColor: THEME.warning }]}
        onPress={reg}
      >
        <Text style={styles.kBtnT}>INITIALIZE_SPRING_BEAN()</Text>
      </TouchableOpacity>
    </View>
  );
};

/** 🐍 PYTHON KERNEL: TENSOR VISUALS */
const PythonKernel = ({ onWin }: any) => {
  const [tensor, setTensor] = useState(Array(12).fill(0));
  const run = () => {
    setTensor((t) => t.map(() => Math.floor(Math.random() * 100)));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Math.random() > 0.8) onWin();
  };
  return (
    <View style={styles.kWrap}>
      <View style={styles.kHead}>
        <Database size={14} color={THEME.success} />
        <Text style={styles.kTitle}>NUMPY_INTERPRETER</Text>
      </View>
      <View style={styles.tGrid}>
        {tensor.map((v, i) => (
          <View
            key={i}
            style={[
              styles.tCell,
              { backgroundColor: `rgba(16, 185, 129, ${v / 100})` },
            ]}
          >
            <Text style={styles.tVal}>{v}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.kBtn, { backgroundColor: THEME.success }]}
        onPress={run}
      >
        <Text style={styles.kBtnT}>EXECUTE_EPOCH()</Text>
      </TouchableOpacity>
    </View>
  );
};

/** 📱 KOTLIN KERNEL: MOBILE UI VISUALS */
const KotlinKernel = ({ onWin }: any) => {
  const [nodes, setNodes] = useState(0);
  const build = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (nodes < 4) setNodes((n) => n + 1);
    else onWin();
  };
  return (
    <View style={styles.kWrap}>
      <View style={styles.kHead}>
        <Smartphone size={14} color={THEME.indigo} />
        <Text style={styles.kTitle}>COMPOSE_RENDER_VIEW</Text>
      </View>
      <View style={styles.mFrame}>
        {Array.from({ length: nodes }).map((_, i) => (
          <Animated.View key={i} entering={FadeInDown} style={styles.mComp}>
            <Layout size={12} color="white" />
            <Text style={styles.mCompT}>Modifier.fillMaxSize()</Text>
          </Animated.View>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.kBtn, { backgroundColor: THEME.indigo }]}
        onPress={build}
      >
        <Text style={styles.kBtnT}>BUILD_ANDROID_UI()</Text>
      </TouchableOpacity>
    </View>
  );
};

/** 🕹️ ARCADE KERNEL: GRAPHICS ENGINE */
const ArcadeKernel = ({ onWin }: any) => {
  const [snake, setSnake] = useState([
    [5, 5],
    [5, 6],
  ]);
  const [dir, setDir] = useState([0, -1]);
  useEffect(() => {
    const loop = setInterval(() => {
      setSnake((p) => {
        const head = p[0];
        const nx = head[0] + dir[0],
          ny = head[1] + dir[1];
        if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15) return p;
        const nb = [[nx, ny], ...p];
        if (nb.length > 8) {
          onWin();
          clearInterval(loop);
        }
        nb.pop();
        return nb;
      });
    }, 200);
    return () => clearInterval(loop);
  }, [dir, onWin]);
  return (
    <View style={styles.kWrap}>
      <View style={styles.gGrid}>
        {Array.from({ length: 15 }).map((_, y) => (
          <View key={y} style={{ flexDirection: 'row' }}>
            {Array.from({ length: 15 }).map((_, x) => (
              <View
                key={x}
                style={[
                  styles.gCell,
                  snake.some((s) => s[0] === x && s[1] === y) && {
                    backgroundColor: THEME.success,
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.gPad}>
        <TouchableOpacity style={styles.dBtn} onPress={() => setDir([0, -1])}>
          <ChevronRight
            size={18}
            color="white"
            style={{ transform: [{ rotate: '-90deg' }] }}
          />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={styles.dBtn} onPress={() => setDir([-1, 0])}>
            <ChevronRight
              size={18}
              color="white"
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.dBtn} onPress={() => setDir([1, 0])}>
            <ChevronRight size={18} color="white" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.dBtn} onPress={() => setDir([0, 1])}>
          <ChevronRight
            size={18}
            color="white"
            style={{ transform: [{ rotate: '90deg' }] }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export function CodeEmulator({ language, code, onComplete }: any) {
  const [boot, setBoot] = useState(false);
  const [status, setStatus] = useState('IDLE');

  const start = () => {
    setStatus('COMPILING');
    setTimeout(() => {
      setStatus('RUNNING');
      setBoot(true);
    }, 1200);
  };

  const renderKernel = () => {
    const l = language.toLowerCase();
    const c = code.toLowerCase();

    if (c.includes('snake') || c.includes('game'))
      return <ArcadeKernel onWin={onComplete} />;
    if (l.includes('java')) return <JavaKernel onWin={onComplete} />;
    if (l.includes('python')) return <PythonKernel onWin={onComplete} />;
    if (l.includes('kotlin')) return <KotlinKernel onWin={onComplete} />;

    // Universal Text Terminal Fallback
    return (
      <View style={styles.console}>
        <Text style={styles.log}>[sys]: Initializing {language} REPL...</Text>
        <Text style={styles.out}>
          {'> '} Logic verified for instruction set.
        </Text>
        <TouchableOpacity style={styles.winB} onPress={onComplete}>
          <Text style={styles.winT}>SUBMIT MODULE</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.frame}>
      <View style={styles.tool}>
        <Text style={styles.tabL}>kernel.{language}_sys</Text>
        <TouchableOpacity
          onPress={() => {
            setBoot(false);
            setStatus('IDLE');
          }}
        >
          <RefreshCcw size={14} color={THEME.slate} />
        </TouchableOpacity>
      </View>
      <View style={styles.viewport}>
        {!boot && status !== 'COMPILING' ? (
          <ScrollView style={styles.ed}>
            <Text style={styles.cText}>{code}</Text>
          </ScrollView>
        ) : (
          renderKernel()
        )}
      </View>
      <View style={styles.act}>
        <Text style={styles.statL}>{status}</Text>
        <TouchableOpacity
          style={styles.runB}
          onPress={start}
          disabled={status === 'COMPILING'}
        >
          <LinearGradient colors={['#6366f1', '#4338ca']} style={styles.runG}>
            {status === 'COMPILING' ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Play size={14} color="white" fill="white" />
                <Text style={styles.runT}>BOOT ENGINE</Text>
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
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: '#020617',
  },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.tool,
    height: 44,
    paddingHorizontal: 16,
  },
  tabL: {
    flex: 1,
    color: THEME.slate,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  viewport: { height: 320, backgroundColor: '#050a18' },
  ed: { flex: 1, padding: 20 },
  cText: {
    color: THEME.success,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  console: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  log: {
    color: '#64748b',
    fontFamily: 'monospace',
    fontSize: 11,
    marginBottom: 5,
  },
  out: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 10 },
  winB: {
    marginTop: 20,
    backgroundColor: THEME.success,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  winT: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  act: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: THEME.tool,
  },
  statL: { color: THEME.slate, fontSize: 10, fontWeight: 'bold' },
  runB: { width: 120, height: 38, borderRadius: 8, overflow: 'hidden' },
  runG: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  runT: { color: 'white', fontWeight: '900', fontSize: 10 },
  kWrap: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  kTitle: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  kBox: {
    backgroundColor: THEME.tool,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
  },
  kVal: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  kLab: { color: THEME.slate, fontSize: 9 },
  kBtn: {
    padding: 14,
    borderRadius: 12,
    marginTop: 15,
    alignItems: 'center',
    width: '100%',
  },
  kBtnT: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  tGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    width: 160,
    justifyContent: 'center',
  },
  tCell: {
    width: 45,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tVal: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  mFrame: {
    width: 180,
    height: 180,
    backgroundColor: '#000',
    borderRadius: 15,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: THEME.slate,
  },
  mComp: {
    height: 32,
    backgroundColor: THEME.indigo,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 5,
  },
  mCompT: { color: 'white', fontSize: 8, fontWeight: 'bold' },
  gGrid: { backgroundColor: '#000', borderWidth: 1, borderColor: '#111' },
  gCell: { width: 12, height: 12, borderWidth: 0.1, borderColor: '#111' },
  gPad: { marginTop: 10, alignItems: 'center' },
  dBtn: {
    width: 38,
    height: 38,
    backgroundColor: THEME.tool,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
