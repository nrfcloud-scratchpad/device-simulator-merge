import { Pairing, PairingStatus } from './pairing/Pairing';

export interface ShadowModelDesired {
    pairing: Pairing;
    topics: Topics;
}

export interface Topics {
    d2c: string;
    c2d: string;
}

export interface ShadowModelReported {
    pairing: Pairing;
    pairingStatus: PairingStatus;
}

export interface ShadowModel {
    desired: ShadowModelDesired;
    reported: ShadowModelReported;
}
