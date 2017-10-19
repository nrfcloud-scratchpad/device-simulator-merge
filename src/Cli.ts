class Cli {
    pairingSession: any;
    stepInProgress: boolean;
    currentStep: number;
    stdin: any;
    constructor(pairing: typeof Pairing) {
        this.pairingSession = pairing;
        this.stdin = process.stdin;
        this.stdin.setRawMode(true);
        this.stdin.resume();
        this.stdin.setEncoding('utf8');

        this.stepInProgress = false;
        this.currentStep;

        this.stdin.on('data', key => {
            if (key === '\u0003') {
                this.closeSession();
            } else {
                switch (key) {
                    case 'n':
                        if (!this.stepInProgress) {
                            try {
                                this.executeNextStep();
                            }
                            catch (error) {
                                // handle error
                                console.log(error);
                            }
                        }
                        break;

                    default:
                        break;
                }
            }
        });
    }

    closeSession() {
        this.pairingSession.unsubscribeToTopic('#');
        console.log('Closing session');
        process.exit();
    }

    executeNextStep() {
        return;
    }
}

export = Cli;
