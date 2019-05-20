/**
 * Message format for simulator app
 */
export interface AppMessage {
  appId: 'GPS' | 'FLIP' | 'TEMP' | 'DEVICE';
  messageType:
    | 'HELLO'
    | 'START'
    | 'STOP'
    | 'INT'
    | 'GET'
    | 'STATUS'
    | 'DATA'
    | 'OK'
    | 'EVENT';
  /**
   * This number is incremented by one for each message transmitted
   */
  messageId?: number;
  timeStamp?: string;
  data?: string;
  [k: string]: any;
}
