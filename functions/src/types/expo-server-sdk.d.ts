declare module 'expo-server-sdk' {
  export class Expo {
    static isExpoPushToken(token: string): boolean;
    chunkPushNotifications(messages: any[]): any[];
    sendPushNotificationsAsync(messages: any[]): Promise<any[]>;
  }
}
