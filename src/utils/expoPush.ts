// src/utils/expoPush.ts
import { Expo } from 'expo-server-sdk';
import { prisma } from '../config/prisma';

// Buat instance Expo SDK
const expo = new Expo();

/**
 * Mengirim Push Notification ke beberapa user spesifik (misal: reminder donor)
 */
export const sendPushNotification = async (targetUserIds: string[], title: string, message: string) => {
    const users = await prisma.user.findMany({
        where: { 
            id: { in: targetUserIds }, 
            pushToken: { not: null } 
        },
        select: { pushToken: true }
    });

    const pushTokens = users
        .map(u => u.pushToken!)
        .filter(token => Expo.isExpoPushToken(token));

    if (pushTokens.length === 0) return;

    const messages = pushTokens.map(pushToken => ({
        to: pushToken,
        title,
        body: message,
        // Konfigurasi Custom Sound
        sound: 'pmi_audio.wav', // Untuk iOS
        channelId: 'default', // Wajib sinkron dengan Android NotificationChannel setup di mobile
    }));

    const chunks = expo.chunkPushNotifications(messages as any);
    for (const chunk of chunks) {
        try {
            await expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
            console.error('Error sending push chunk', error);
        }
    }
};

/**
 * Broadcast darurat ke SELURUH user yang punya push token
 */
export const broadcastPushNotification = async (title: string, message: string) => {
    const users = await prisma.user.findMany({
        where: { pushToken: { not: null } },
        select: { pushToken: true }
    });

    const pushTokens = users
        .map(u => u.pushToken!)
        .filter(token => Expo.isExpoPushToken(token));

    if (pushTokens.length === 0) return;
    
    const messages = pushTokens.map(pushToken => ({
        to: pushToken,
        title,
        body: message,
        sound: 'pmi_audio.wav',
        channelId: 'default', 
    }));

    const chunks = expo.chunkPushNotifications(messages as any);
    for (const chunk of chunks) {
        try {
            await expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
            console.error('Error sending broadcast push chunk', error);
        }
    }
};
