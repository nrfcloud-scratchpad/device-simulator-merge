import { Pairing, PairingStatus } from './pairing/Pairing';

export interface ShadowModelDesired {
    pairing: Pairing;
}

export interface ShadowModelReported {
    pairing: Pairing;
    pairingStatus: PairingStatus;
}

export interface ShadowModel {
    desired: ShadowModelDesired;
    reported: ShadowModelReported;
}
