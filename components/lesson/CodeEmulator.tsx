import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Platform, 
  Dimensions,
  TextInput
} from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  withSequence, 
  withRepeat,
  withSpring,
  useSharedValue, 
  FadeIn, 
  ZoomIn,
  runOnJS
} from 'react-native-reanimated';
import { Play, Terminal, Smartphone, RefreshCcw, Zap, Box, Layers, Activity } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// --- THEME ENGINE ---
const THEME = {
  bg: '#0f172a',
  toolbar: '#1e293b',
  editor: '#0b1120',
  green: '#10b981',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  orange: '#f97316',
  red: '#ef4444',
  yellow: '#eab308',
  text: '#f8fafc',
  comment: '#64748b',
  grid: 'rgba(255,255,255,0.05)'
};

// --- TYPES ---
interface CodeEmulatorProps {
  language: string;
  code: string;
  onComplete: () => void;
  visualMode?: boolean; 
}

type GameState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'GAME_OVER' | 'VICTORY';

/**
 * ============================================================================
 * 🐍 MINI-GAME ENGINE: SNAKE (Python Simulation)
 * ============================================================================
 */
const SnakeGame = ({ onWin }: { onWin: () => void }) => {
  const [snake, setSnake] = useState([[0, 0], [1, 0], [2, 0]]);
  const [food, setFood] = useState([5, 5]);
  const [direction, setDirection] = useState([1, 0]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Game Loop
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setSnake(prev => {
        const newHead = [prev[prev.length - 1][0] + direction[0], prev[prev.length - 1][1] + direction[1]];
        
        // Wall Collision
        if (newHead[0] >= 15 || newHead[0] < 0 || newHead[1] >= 15 || newHead[1] < 0) {
          setGameOver(true);
          return prev;
        }

        const newSnake = [...prev, newHead];
        // Food Collision
        if (newHead[0] === food[0] && newHead[1] === food[1]) {
          setScore(s => s + 10);
          setFood([Math.floor(Math.random() * 15), Math.floor(Math.random() * 15)]);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (score >= 50) onWin(); // Win condition
        } else {
          newSnake.shift();
        }
        return newSnake;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [direction, food, gameOver, onWin, score]);

  return (
    <View style={styles.gameContainer}>
      <View style={styles.gameHeader}>
        <Text style={styles.gameScore}>SCORE: {score}</Text>
        <Text style={styles.gameTitle}>PYTHON_SNAKE.EXE</Text>
      </View>
      <View style={styles.grid}>
        {Array.from({ length: 15 }).map((_, y) => (
          <View key={y} style={styles.row}>
            {Array.from({ length: 15 }).map((_, x) => {
              const isSnake = snake.some(s => s[0] === x && s[1] === y);
              const isFood = food[0] === x && food[1] === y;
              return (
                <View key={`${x}-${y}`} style={[
                  styles.cell,
                  isSnake && { backgroundColor: THEME.green },
                  isFood && { backgroundColor: THEME.red, borderRadius: 50 }
                ]} />
              );
            })}
          </View>
        ))}
      </View>
      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={() => setDirection([-1, 0])}><Text style={styles.ctrlText}>←</Text></TouchableOpacity>
        <View style={{gap: 10}}>
           <TouchableOpacity style={styles.ctrlBtn} onPress={() => setDirection([0, -1])}><Text style={styles.ctrlText}>↑</Text></TouchableOpacity>
           <TouchableOpacity style={styles.ctrlBtn} onPress={() => setDirection([0, 1])}><Text style={styles.ctrlText}>↓</Text></TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.ctrlBtn} onPress={() => setDirection([1, 0])}><Text style={styles.ctrlText}>→</Text></TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * ============================================================================
 * ⚛️ MINI-APP ENGINE: REACT CLICKER
 * ============================================================================
 */
const ReactClicker = ({ onWin }: { onWin: () => void }) => {
  const [count, setCount] = useState(0);
  const scale = useSharedValue(1);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCount(c => {
      const newCount = c + 1;
      if (newCount >= 10) onWin();
      return newCount;
    });
    
    scale.value = withSequence(
      withTiming(1.2, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.appContainer}>
      <View style={styles.phoneNotch} />
      <View style={styles.appHeader}>
        <Text style={styles.appTitle}>React Counter</Text>
      </View>
      <View style={styles.appBody}>
        <Text style={styles.counterLabel}>Current Count</Text>
        <Animated.Text style={[styles.counterValue, animatedStyle]}>{count}</Animated.Text>
        <TouchableOpacity style={styles.appBtn} onPress={handlePress}>
          <Text style={styles.appBtnText}>INCREMENT</Text>
        </TouchableOpacity>
        <Text style={styles.hintText}>Reach 10 to complete lesson</Text>
      </View>
    </View>
  );
};

/**
 * ============================================================================
 * 🦀 SYSTEM VISUALIZER: MEMORY ALLOCATOR (Rust/Java)
 * ============================================================================
 */
const SystemMonitor = ({ onWin }: { onWin: () => void }) => {
  const [blocks, setBlocks] = useState<boolean[]>(Array(20).fill(false));
  
  useEffect(() => {
    let allocated = 0;
    const interval = setInterval(() => {
      setBlocks(prev => {
        const next = [...prev];
        const idx = Math.floor(Math.random() * next.length);
        if (!next[idx]) {
          next[idx] = true;
          allocated++;
          Haptics.selectionAsync();
        }
        return next;
      });
      
      if (allocated >= 15) {
        clearInterval(interval);
        onWin();
      }
    }, 200);
    return () => clearInterval(interval);
  }, [onWin]);

  return (
    <View style={styles.monitorContainer}>
      <View style={styles.monitorHeader}>
        <Activity size={16} color={THEME.green} />
        <Text style={styles.monitorTitle}>HEAP_ALLOCATOR</Text>
      </View>
      <View style={styles.memoryGrid}>
        {blocks.map((active, i) => (
          <Animated.View 
            key={i} 
            entering={ZoomIn.delay(i * 50)}
            style={[styles.memoryBlock, active && { backgroundColor: THEME.orange }]} 
          />
        ))}
      </View>
      <Text style={styles.monitorLog}>&gt;&gt; Allocating memory segments...</Text>
    </View>
  );
};

/**
 * ============================================================================
 * 🖥️ MAIN EMULATOR COMPONENT
 * ============================================================================
 */
export function CodeEmulator({ language, code, onComplete, visualMode = false }: CodeEmulatorProps) {
  const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'SUCCESS'>('IDLE');
  const [consoleOutput, setConsoleOutput] = useState('');
  const [showGame, setShowGame] = useState(false);
  
  const progress = useSharedValue(0);

  const runCode = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setStatus('RUNNING');
    setConsoleOutput('');
    progress.value = 0;
    
    // 1. Compilation Animation
    progress.value = withTiming(100, { duration: 1200 }, (finished) => {
      if (finished) {
        runOnJS(startExecution)();
      }
    });
  };

  const startExecution = () => {
    // 2. Decide Execution Path
    if (visualMode) {
      setShowGame(true);
    } else {
      setStatus('SUCCESS');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      simulateTypewriter(generateConsoleOutput(language));
    }
  };

  const handleGameWin = () => {
    setStatus('SUCCESS');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(onComplete, 1500); // Allow time to celebrate
  };

  const simulateTypewriter = (text: string) => {
    let i = 0;
    const interval = setInterval(() => {
      setConsoleOutput((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        setTimeout(onComplete, 2000);
      }
    }, 15);
  };

  // Determine which visualizer to show
  const renderVisualizer = () => {
    const lang = language.toLowerCase();
    if (lang.includes('python')) return <SnakeGame onWin={handleGameWin} />;
    if (lang.includes('react') || lang.includes('javascript')) return <ReactClicker onWin={handleGameWin} />;
    return <SystemMonitor onWin={handleGameWin} />;
  };

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  return (
    <Animated.View entering={FadeIn.duration(600)} style={styles.container}>
      {/* TOOLBAR */}
      <View style={styles.toolbar}>
        <View style={styles.dots}>
          <View style={[styles.dot, { backgroundColor: THEME.red }]} />
          <View style={[styles.dot, { backgroundColor: THEME.yellow }]} />
          <View style={[styles.dot, { backgroundColor: THEME.green }]} />
        </View>
        <Text style={styles.filename}>{visualMode ? 'Interactive Preview' : `main.${getExt(language)}`}</Text>
        {visualMode ? <Smartphone size={14} color={THEME.blue} /> : <Terminal size={14} color={THEME.comment} />}
      </View>

      {/* MAIN CONTENT AREA */}
      <View style={styles.workspace}>
        {!showGame ? (
          <ScrollView style={styles.editor} contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.codeFont}>{code}</Text>
          </ScrollView>
        ) : (
          <Animated.View entering={ZoomIn} style={styles.gameWrapper}>
            {renderVisualizer()}
          </Animated.View>
        )}
      </View>

      {/* CONTROL BAR */}
      <View style={styles.actionBar}>
        <Text style={styles.statusText}>
          {status === 'IDLE' ? 'Ready' : status === 'RUNNING' ? 'Compiling...' : 'Active'}
        </Text>
        
        {!showGame && (
          <TouchableOpacity 
            style={[styles.runBtn, status !== 'IDLE' && styles.disabled]} 
            onPress={runCode}
            disabled={status !== 'IDLE'}
          >
            <Play size={14} color="white" fill="white"/>
            <Text style={styles.runText}>{status === 'IDLE' ? 'RUN' : 'BUSY'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 2, backgroundColor: THEME.toolbar }}>
        <Animated.View style={[{ height: '100%', backgroundColor: visualMode ? THEME.purple : THEME.green }, barStyle]} />
      </View>

      {/* CONSOLE (Text Mode Only) */}
      {!visualMode && (status === 'RUNNING' || status === 'SUCCESS') && (
        <View style={styles.console}>
          <Text style={styles.consoleText}>{consoleOutput}<Text style={styles.cursor}>_</Text></Text>
        </View>
      )}
    </Animated.View>
  );
}

// --- UTILS ---
function getExt(lang: string) {
  const map: any = { python: 'py', javascript: 'js', typescript: 'ts', java: 'java', rust: 'rs' };
  return map[lang?.toLowerCase()] || 'txt';
}

function generateConsoleOutput(lang: string) {
  if (lang.includes('rust')) return `> Compiling target debug...\n> Finished dev [unoptimized] target(s) in 0.42s\n> Running \`target/debug/main\`\n> System Memory: SAFE\n> Threads: 4 Active`;
  if (lang.includes('java')) return `> javac Main.java\n> java Main\n> Spring Boot v3.1.0 starting...\n> Tomcat initialized on port 8080\n> JVM Heap: 512MB OK`;
  return `> Interpreting script...\n> Process started.\n> Logic verified.\n> Execution time: 0.04s`;
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.bg,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 16,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, backgroundColor: THEME.toolbar, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  filename: { color: THEME.comment, fontSize: 12, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  workspace: { flexDirection: 'column', minHeight: 200 },
  editor: { height: 200, backgroundColor: THEME.editor },
  codeFont: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: THEME.text, fontSize: 13, lineHeight: 20 },
  
  actionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: THEME.toolbar },
  statusText: { color: THEME.comment, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  runBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.blue, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, gap: 6 },
  disabled: { opacity: 0.5 },
  runText: { color: 'white', fontWeight: '800', fontSize: 12 },
  
  console: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 16, minHeight: 80 },
  consoleText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#e2e8f0', fontSize: 12 },
  cursor: { color: THEME.green, fontWeight: 'bold' },

  // --- GAME VISUALIZER STYLES ---
  gameWrapper: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 },
  
  // Snake
  gameContainer: { alignItems: 'center' },
  gameHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10 },
  gameTitle: { color: THEME.green, fontWeight: '900', fontSize: 10, letterSpacing: 2 },
  gameScore: { color: 'white', fontWeight: 'bold' },
  grid: { borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b' },
  row: { flexDirection: 'row' },
  cell: { width: 15, height: 15, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.2)' },
  controls: { flexDirection: 'row', marginTop: 15, alignItems: 'center', gap: 10 },
  ctrlBtn: { width: 40, height: 40, backgroundColor: '#334155', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ctrlText: { color: 'white', fontWeight: 'bold' },

  // React App
  appContainer: { width: '80%', height: 300, backgroundColor: 'white', borderRadius: 20, overflow: 'hidden' },
  phoneNotch: { height: 20, backgroundColor: '#e2e8f0', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, marginHorizontal: 40 },
  appHeader: { height: 40, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  appTitle: { color: 'white', fontWeight: 'bold' },
  appBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  counterLabel: { color: '#64748b', fontSize: 12, textTransform: 'uppercase' },
  counterValue: { fontSize: 48, fontWeight: '900', color: '#1e293b' },
  appBtn: { backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity:0.2, shadowRadius:4 },
  appBtnText: { color: 'white', fontWeight: 'bold' },
  hintText: { color: '#94a3b8', fontSize: 10, marginTop: 10 },

  // Monitor
  monitorContainer: { width: '100%', padding: 10 },
  monitorHeader: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  monitorTitle: { color: THEME.orange, fontWeight: '900' },
  memoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  memoryBlock: { width: 25, height: 25, backgroundColor: '#334155', borderRadius: 2 },
  monitorLog: { color: THEME.comment, marginTop: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 10 }
});