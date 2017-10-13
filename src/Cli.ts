class Cli {
    pairingSession: any;
    stepInProgress: boolean;
    currentStep: number;
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
                        if (!this.stepInProcess) {
                            this.executeNextStep()
                            .catch(reason => {
                                // handle error
                                console.log(reason);
                            });
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
}

module.exports = Cli;
