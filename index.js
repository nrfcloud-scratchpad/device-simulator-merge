const Thingy = require('./Thingy');
const Pairing = require('./Pairing');
const Cli = require('./Cli');

const device = new Thingy();
const pairing = new Pairing();
let cli;



if (process.argv[2]) {
    const argument = process.argv[2];
    if (argument === 'cli') {
        cli = new Cli(pairing);
    } else {
        run();
    }
}




const run = () => {
    device.extractDeviceId()
    .then(pairing.setDevice(device))
    .then(pairing.setCloudConfiguration())
    .then(pairing.connect)
    .then(() => {
        console.log("huzzah");
    })
    .catch(reason => {
        console.log("Rejection: something failed:");
        console.log(reason);
    });
}