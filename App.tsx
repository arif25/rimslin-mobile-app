import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  useAudioRecorder,
  useAudioPlayer,
  AudioModule,
  RecordingPresets
} from 'expo-audio';
import * as Speech from 'expo-speech';
import { sendVoiceToBackend, AIResponse } from './services/api';

export default function App() {
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  // লাইভ ডায়নামিক স্টেট
  const [data, setData] = useState<AIResponse>({
    bangla: 'কথা বলার জন্য নিচের মাইকে চাপুন',
    arabic: 'أَهْلًا وَسَهْلًا',
    arabicPronounce: 'আহলান ওয়া সাহলান',
    english: 'Welcome',
    englishPronounce: 'ওয়েলকাম',
    hindi: 'नमस्ते',
    pronunciationTip: 'মাইকে স্পষ্ট ও স্বাভাবিক গতিতে কথা বলুন।',
    score: 92,
    feedbackBadge: 'উৎসুক শিক্ষার্থী',
  });

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(recordedUri);

  function speakText(text: string, langCode: string) {
    Speech.stop();
    Speech.speak(text, { language: langCode, pitch: 1.0, rate: 0.85 });
  }

  async function startRecording() {
    try {
      Speech.stop();
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('অনুমতি প্রয়োজন', 'মাইক্রোফোন ব্যবহারের অনুমতি দিন।');
        return;
      }

      await AudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (err: any) {
      Alert.alert('এরর', err?.message || 'রেকর্ডিং শুরু করা যায়নি');
    }
  }

  async function stopRecording() {
    try {
      await recorder.stop();
      setIsRecording(false);
      const uri = recorder.uri;
      if (uri) {
        setRecordedUri(uri);
        // অডিও ফাইল স্বয়ংক্রিয়ভাবে নেক্সটজেএস ব্যাকএন্ডে পাঠানো
        handleVoiceUpload(uri);
      }
    } catch (err: any) {
      setIsRecording(false);
    }
  }

  async function handleVoiceUpload(uri: string) {
    setLoading(true);
    try {
      const result = await sendVoiceToBackend(uri);
      setData(result);
    } catch (err: any) {
      Alert.alert('কানেকশন এরর', err.message || 'মোবাইল ও ল্যাপটপ একই ওয়াইফাই-তে আছে কিনা চেক করুন');
    } finally {
      setLoading(false);
    }
  }

  async function playRecordedAudio() {
    if (player && recordedUri) {
      Speech.stop();
      await AudioModule.setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      player.play();
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Rimslin AI Coach</Text>
            <Text style={styles.headerSubtitle}>বাংলা বলুন, আরবি ও ইংরেজিতে শিখুন</Text>
          </View>

          {/* প্রসেসিং ইন্ডিকেটর */}
          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#38bdf8" />
              <Text style={styles.loadingText}>AI বিশ্লেষণ ও অনুবাদ করছে...</Text>
            </View>
          )}

          {/* ইনপুট স্পিকিং বক্স */}
          <View style={styles.inputCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.badge}>🇧🇩 আপনার ইনপুট (বাংলা)</Text>
            </View>
            <Text style={styles.inputText}>"{data.bangla}"</Text>

            {recordedUri && !isRecording && (
              <TouchableOpacity style={styles.playSelfBtn} onPress={playRecordedAudio}>
                <Text style={styles.playSelfText}>🔊 আপনার ভয়েস শুনুন</Text>
              </TouchableOpacity>
            )}
          </View>

          {data.pronunciationTip && (
            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>💡 টিপস:</Text>
              <Text style={styles.tipText}>{data.pronunciationTip}</Text>
            </View>
          )}

          {/* SpeakX Style Live Score Card */}
          <View style={{ backgroundColor: '#1E293B', padding: 16, borderRadius: 16, marginBottom: 16, alignItems: 'center' }}>
            <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>
              উচ্চারণ ও স্পষ্টতা স্কোর
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginVertical: 8 }}>
              <Text style={{ color: data.score && data.score >= 80 ? '#22C55E' : '#EAB308', fontSize: 44, fontWeight: '800' }}>
                {data.score || 0}
              </Text>
              <Text style={{ color: '#64748B', fontSize: 20, fontWeight: '700', marginLeft: 4 }}>/100</Text>
            </View>

            <View style={{ backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ color: '#38BDF8', fontSize: 13, fontWeight: '600' }}>
                ⭐ {data.feedbackBadge || 'প্র্যাকটিস চালিয়ে যান'}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>স্মার্ট আউটপুট</Text>

          {/* আরবি কার্ড */}
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.langName}>🇸🇦 আরবি (Arabic)</Text>
              <TouchableOpacity
                style={styles.soundMiniBtn}
                onPress={() => speakText(data.arabic, "ar-SA")}
              >
                <Text style={styles.soundIcon}>🔊 শুনুন</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.arabicText}>{data.arabic}</Text>
            <Text style={styles.transliterationText}>উচ্চারণ: {data.arabicPronounce}</Text>
          </View>

          {/* ইংরেজি কার্ড */}
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.langName}>🇬🇧 ইংরেজি (English)</Text>
              <TouchableOpacity
                style={styles.soundMiniBtn}
                onPress={() => speakText(data.english, "en-US")}
              >
                <Text style={styles.soundIcon}>🔊 শুনুন</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.englishText}>"{data.english}"</Text>
            <Text style={styles.transliterationText}>উচ্চারণ: {data.englishPronounce}</Text>
          </View>

          {/* হিন্দি কার্ড */}
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.langName}>🇮🇳 হিন্দি (Hindi)</Text>
              <TouchableOpacity
                style={styles.soundMiniBtn}
                onPress={() => speakText(data.hindi, "hi-IN")}
              >
                <Text style={styles.soundIcon}>🔊 শুনুন</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hindiText}>{data.hindi}</Text>
          </View>
        </ScrollView>

        {/* বটম ফ্লোটিং মাইক বাটন */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.micBtn, isRecording ? styles.micBtnRecording : styles.micBtnIdle]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={loading}
          >
            <Text style={styles.micBtnText}>
              {isRecording ? 'থামান ⏹' : loading ? 'অপেক্ষা করুন...' : 'কথা বলুন 🎙️'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scrollContent: { padding: 20, paddingBottom: 130 },
  header: { alignItems: 'center', marginVertical: 14 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#38bdf8' },
  headerSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4 },

  loadingBox: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  loadingText: { color: '#38bdf8', marginLeft: 8, fontSize: 14, fontWeight: '500' },

  inputCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  badge: { color: '#38bdf8', fontSize: 13, fontWeight: '600' },
  inputText: { fontSize: 18, color: '#f8fafc', fontWeight: '500' },
  playSelfBtn: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#334155', borderRadius: 8, alignSelf: 'flex-start' },
  playSelfText: { color: '#38bdf8', fontSize: 13, fontWeight: '600' },

  tipCard: { backgroundColor: '#1e1b4b', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#4338ca' },
  tipTitle: { color: '#a5b4fc', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  tipText: { color: '#e0e7ff', fontSize: 14 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  resultCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  langName: { fontSize: 14, fontWeight: '700', color: '#cbd5e1' },
  soundMiniBtn: { backgroundColor: '#0284c7', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  soundIcon: { color: '#ffffff', fontSize: 12, fontWeight: '600' },

  arabicText: { fontSize: 22, color: '#f8fafc', fontWeight: 'bold', textAlign: 'right', marginVertical: 6 },
  englishText: { fontSize: 17, color: '#f8fafc', fontWeight: '600', marginVertical: 4 },
  hindiText: { fontSize: 17, color: '#f8fafc', fontWeight: '500', marginVertical: 4 },
  transliterationText: { fontSize: 13, color: '#94a3b8', marginTop: 4 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 16, paddingHorizontal: 20, backgroundColor: 'rgba(15, 23, 42, 0.95)', borderTopWidth: 1, borderTopColor: '#1e293b', alignItems: 'center' },
  micBtn: { width: '90%', paddingVertical: 15, borderRadius: 50, alignItems: 'center' },
  micBtnIdle: { backgroundColor: '#0284c7' },
  micBtnRecording: { backgroundColor: '#ef4444' },
  micBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
});