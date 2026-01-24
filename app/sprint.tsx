import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { api } from '../services/api';
import { SprintCard, QuestionType, SprintResult } from '../types';
import Button from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { X, CheckCircle, AlertCircle, ArrowRight, Trophy } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { 
    FadeIn, 
    FadeInDown, 
    FadeOutLeft, 
    SlideInRight, 
    LinearTransition,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
    Extrapolation
} from 'react-native-reanimated';
import { clsx } from 'clsx';

export default function SprintScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  
  const [cards, setCards] = useState<SprintCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [completedResult, setCompletedResult] = useState<SprintResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Calling Real API
    api.generateDailySprint()
        .then(data => {
            if (data && data.length > 0) {
                setCards(data);
            } else {
                setErrorMsg("No content generated. Please try again later.");
            }
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setErrorMsg("Failed to generate sprint. Check your connection.");
            setLoading(false);
        });
  }, []);

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    const currentCard = cards[currentIndex];
    if (selectedOption === null && currentCard.type !== QuestionType.INFO) return;

    setIsAnswered(true);

    if (currentCard.type !== QuestionType.INFO) {
      if (selectedOption === currentCard.correctAnswer) {
        setScore(prev => prev + 1);
      }
    }
  };

  const handleNext = async () => {
    const currentCard = cards[currentIndex];
    
    // Animate out? For now we just increment index and the `key` prop on Animated.View handles the transition
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setLoading(true);
      const result = await api.completeSprint(
          score + (currentCard.correctAnswer === selectedOption ? 1 : 0), 
          cards.filter(c => c.type !== QuestionType.INFO).length
      );
      setCompletedResult(result);
      setLoading(false);
    }
  };

  if (loading && !completedResult) {
    return (
      <View className="flex-1 bg-dark items-center justify-center p-8">
        <ActivityIndicator size="large" color="#6366f1" className="mb-4" />
        <Text className="text-xl font-bold text-white">Generating Sprint...</Text>
        <Text className="text-gray-400 text-center mt-2">AI is curating your personalized session</Text>
      </View>
    );
  }

  if (errorMsg) {
      return (
        <View className="flex-1 bg-dark items-center justify-center p-8">
            <AlertCircle size={48} color="#f87171" />
            <Text className="text-xl font-bold text-white mt-4 text-center">Connection Error</Text>
            <Text className="text-gray-400 text-center mt-2 mb-8">{errorMsg}</Text>
            <Button onPress={() => router.back()}>Exit</Button>
        </View>
      );
  }

  // --- Success Screen ---
  if (completedResult) {
    return (
      <View className="flex-1 bg-dark items-center justify-center p-6 relative">
        {/* Background Gradient Blob */}
        <View className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
        <View className="absolute bottom-1/4 -right-20 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl" />

        <Animated.View entering={FadeInDown.springify()} className="items-center w-full max-w-sm">
            <View className="w-24 h-24 bg-yellow-500/20 rounded-full items-center justify-center mb-6 border border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                <Trophy size={48} color="#facc15" />
            </View>
            <Text className="text-3xl font-black text-white mb-2 text-center">SPRINT COMPLETE</Text>
            <Text className="text-gray-400 mb-10 text-center">Consistency is key. See you tomorrow!</Text>

            <View className="flex-row gap-4 w-full mb-8">
                <GlassCard className="flex-1 p-4 items-center" intensity="light">
                    <Text className="text-xs text-gray-400 uppercase font-bold tracking-wider">XP Earned</Text>
                    <Text className="text-3xl font-black text-indigo-400">+{completedResult.xpEarned}</Text>
                </GlassCard>
                <GlassCard className="flex-1 p-4 items-center" intensity="light">
                    <Text className="text-xs text-gray-400 uppercase font-bold tracking-wider">Accuracy</Text>
                    <Text className="text-3xl font-black text-green-400">
                        {Math.round((completedResult.questionsCorrect / completedResult.totalQuestions) * 100)}%
                    </Text>
                </GlassCard>
            </View>

            <Button onPress={() => router.replace('/')} fullWidth size="lg">Return Home</Button>
        </Animated.View>
      </View>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex) / cards.length) * 100;

  return (
    <SafeAreaView className="flex-1 bg-dark">
      {/* Background Ambience */}
      <View className="absolute top-0 left-0 right-0 h-full overflow-hidden" pointerEvents="none">
         <View className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
         <View className="absolute top-1/3 -right-20 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
      </View>

      <View className="flex-1 flex-col p-4 md:p-8 max-w-2xl w-full self-center">
        {/* Header / Progress */}
        <View className="flex-row items-center gap-4 mb-6 z-10">
          <Pressable onPress={() => router.back()} className="p-2 rounded-full bg-surface/50">
            <X size={20} color="#9ca3af" />
          </Pressable>
          <View className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <Animated.View 
              className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
              layout={LinearTransition.springify()}
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>

        {/* Card Content - Using Key to force re-render animation on change */}
        <Animated.View 
          key={currentIndex} 
          entering={SlideInRight.springify().damping(20).stiffness(150)} 
          exiting={FadeOutLeft.duration(200)}
          className="flex-1"
        >
          <GlassCard className="flex-1 p-6" intensity="heavy">
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              
              {/* Type Badge */}
              <View className="self-start px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
                  <Text className="text-[10px] font-bold text-indigo-300 tracking-widest uppercase">
                    {currentCard.type === QuestionType.INFO ? 'DID YOU KNOW?' : 'QUIZ TIME'}
                  </Text>
              </View>

              {/* Title & Content */}
              <Text className="text-2xl md:text-3xl font-bold text-white leading-tight mb-4">
                {currentCard.title}
              </Text>
              <Text className="text-lg text-gray-300 leading-relaxed mb-8">
                {currentCard.content}
              </Text>

              {/* Options */}
              {currentCard.options && (
                <View className="gap-3">
                  {currentCard.options.map((option, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === currentCard.correctAnswer;
                    
                    let borderColor = "border-white/10";
                    let bgColor = "bg-white/5";
                    let textColor = "text-gray-300";

                    if (isAnswered) {
                         if (isCorrect) {
                             borderColor = "border-green-500/50";
                             bgColor = "bg-green-500/20";
                             textColor = "text-green-300";
                         } else if (isSelected) {
                             borderColor = "border-red-500/50";
                             bgColor = "bg-red-500/20";
                             textColor = "text-red-300";
                         } else {
                             bgColor = "bg-black/20";
                             textColor = "text-gray-600";
                         }
                    } else if (isSelected) {
                        borderColor = "border-indigo-500";
                        bgColor = "bg-indigo-500/20";
                        textColor = "text-white";
                    }

                    return (
                      <Pressable
                        key={idx}
                        onPress={() => handleOptionSelect(idx)}
                        disabled={isAnswered}
                        className={clsx(
                          "w-full p-4 rounded-xl border transition-all active:scale-[0.99]",
                          borderColor, bgColor
                        )}
                      >
                        <Text className={clsx("text-base font-medium", textColor)}>{option}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Explanation Reveal */}
              {isAnswered && currentCard.explanation && (
                <Animated.View 
                    entering={FadeInDown.springify()} 
                    className={clsx(
                        "mt-6 p-4 rounded-xl border backdrop-blur-md", 
                        selectedOption === currentCard.correctAnswer 
                            ? 'bg-green-900/30 border-green-500/30' 
                            : 'bg-red-900/30 border-red-500/30'
                    )}
                >
                  <View className="flex-row items-center gap-2 mb-2">
                    {selectedOption === currentCard.correctAnswer ? (
                      <CheckCircle size={18} color="#4ade80"/>
                    ) : (
                      <AlertCircle size={18} color="#f87171"/>
                    )}
                    <Text className={clsx("font-bold uppercase text-xs tracking-wider", selectedOption === currentCard.correctAnswer ? "text-green-400" : "text-red-400")}>
                        {selectedOption === currentCard.correctAnswer ? "Correct" : "Incorrect"}
                    </Text>
                  </View>
                  <Text className="text-sm text-gray-200 leading-6">{currentCard.explanation}</Text>
                </Animated.View>
              )}
            </ScrollView>
          </GlassCard>
        </Animated.View>

        {/* Footer Actions */}
        <View className="mt-6 mb-safe z-20">
          {!isAnswered && currentCard.type !== QuestionType.INFO ? (
            <Button 
              fullWidth 
              size="lg" 
              onPress={handleSubmit} 
              disabled={selectedOption === null}
              className="shadow-lg shadow-indigo-500/20"
            >
              Check Answer
            </Button>
          ) : (
             <Button fullWidth size="lg" onPress={handleNext} className="flex-row gap-2 bg-white/10 border border-white/20">
               <Text className="text-white font-semibold">{currentIndex === cards.length - 1 ? 'Finish Sprint' : 'Continue'}</Text>
               <ArrowRight size={20} color="white"/>
             </Button>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}