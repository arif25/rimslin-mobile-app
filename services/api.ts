import * as FileSystem from 'expo-file-system/legacy';

const BACKEND_URL = 'rimslin-backend.vercel.app';

export interface AIResponse {
    bangla: string;
    arabic: string;
    arabicPronounce: string;
    english: string;
    englishPronounce: string;
    hindi: string;
    pronunciationTip?: string;
    score?: number;
    feedbackBadge?: string;
}

export async function sendVoiceToBackend(audioUri: string): Promise<AIResponse> {
    // অডিও ফাইলকে সরাসরি Base64 স্ট্রিং হিসেবে রিড করা
    const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    const response = await fetch(`${BACKEND_URL}/api/coach/process`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            audioBase64: base64Audio,
        }),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'সার্ভার থেকে সঠিক রেসপন্স পাওয়া যায়নি');
    }

    return await response.json();
}