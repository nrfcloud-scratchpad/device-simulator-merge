/// <reference types="node" />
import { IHostConnection } from './HostConnection';
import { ShadowModelReported } from '../ShadowModel';
import { EventEmitter } from 'events';
export declare type OnUpdateShadow = (updateShadow: ShadowModelReported) => Promise<void>;
export declare type OnSendMessage = (topic: string, message: string) => Promise<void>;
export declare class FakeHostConnection extends EventEmitter implements IHostConnection {
    private reported;
    private onUpdateShadow;
    private onSendMessage;
    private d2c;
    private c2d;
    constructor(onUpdateShadow?: OnUpdateShadow, onSendMessage?: OnSendMessage, newLogger?: any);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    updateShadow(reported: ShadowModelReported): Promise<void>;
    sendMessage(message: string): Promise<void>;
    setTopics(c2d: string, d2c: string): Promise<void>;
}