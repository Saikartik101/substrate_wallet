const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const { ApiPromise, WsProvider } = require('@polkadot/api');
const {
    mnemonicGenerate,
    mnemonicValidate
} = require('@polkadot/util-crypto');
const { Keyring } = require('@polkadot/keyring');
const BN = require('bn.js');

app.use(session({
    secret: 'green_wallet', // Change this to a secure secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  }));

const connect = async () => {
    const wsProvider = new WsProvider('ws://127.0.0.1:9944');
    const api = new ApiPromise({ provider: wsProvider });
    await api.isReady; // Wait for the API to be ready
    return api;
};

const keyring = new Keyring({ type: 'sr25519' });

const createAccount = (mnemonic) => {
    mnemonic = mnemonic && mnemonicValidate(mnemonic)
        ? mnemonic
        : mnemonicGenerate();
    const account = keyring.addFromMnemonic(mnemonic);
    return { account, mnemonic };
}

const urlencodedParser = bodyParser.urlencoded({ extended: false });

let api; // Declare api as a global variable

(async () => {
    api = await connect(); // Connect to the Substrate node when the application starts
})();

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    const mn = req.session.mn || 'Guest';
    if(mn==='Guest'){
        res.sendFile(__dirname + '/index.html');
    }
    else{
        res.redirect('/dash');
    }
});

app.get('/p2', (req, res) => {
    res.sendFile(__dirname + '/p2.html');
});

app.get('/manual', (req, res) => {
    console.log(`Our client is connected: ${api.isConnected}`);
    res.sendFile(__dirname + '/mne.html');
    
});

app.get('/txn', async (req, res) => {
    console.log(`Our client is connected: ${api.isConnected}`);
    res.sendFile(__dirname + '/txn.html');

});

app.get('/dash', async (req, res) => {
    console.log(`Our client is connected: ${api.isConnected}`);
    const add1 = req.session.add1 || 'Guest';
    const balance1 = await api.derive.balances.all(add1);
    const available1 = balance1.availableBalance.toNumber();
    const dots1 = available1 / (10 ** api.registry.chainDecimals);
    const print1 = dots1.toFixed(4);
    req.session.sd = print1;
    res.render('dash', { bal: print1,add:add1  });
});



app.post('/txn', urlencodedParser, async (req, res) => {
    try {
        console.log(`Our client is connected: ${api.isConnected}`);
        const tadd = req.body.firstName;
        const tamo = req.body.lastName;
        const tamo1 = parseInt(tamo);
        const mn = req.session.mn || 'Guest';
        console.log(mn);
        const { account: m1 } = createAccount(mn);
        const balance = await api.derive.balances.all(m1.address);
        const available = balance.availableBalance;
        const decims = new BN(api.registry.chainDecimals);
        const factor = new BN(10).pow(decims);
        const amount = new BN(tamo1).mul(factor);
        console.log(tadd);
        console.log(tamo1);
        console.log(amount);
        const transfer = api.tx.balances.transfer(tadd, amount);

        const { partialFee } = await transfer.paymentInfo(m1);
        const fees = partialFee.muln(110).divn(100);

        const total = amount
            .add(fees)
            .add(api.consts.balances.existentialDeposit);

        if (total.gt(available)) {
            res.render('stxn', { txn1: "Transaction Failed Due to Insufficient Balance", txn2: "", txn3: "" });
        } else {
            const tx = await transfer.signAndSend(m1);
            let strm = "Transaction ID: " + tx;
            res.render('stxn', { txn1: "Transaction Successful", txn2: fees, txn3: strm });

        }
    } catch (error) {
        console.error("Green Network:", error);
        res.render('stxn', { txn1: "Transaction Failed Due to Insufficient Balance", txn2: "", txn3: "" });
    }
});


app.post('/manual', urlencodedParser, async (req, res) => {
    const phrase = req.body.firstName;
    req.session.mn = phrase;
    const { account: m2 } = createAccount(phrase);
    const phrase1 = { address: m2.address };
    const balance = await api.derive.balances.all(m2.address);
    const available = balance.availableBalance.toNumber();
    const dots = available / (10 ** api.registry.chainDecimals);
    const print = dots.toFixed(4);
    req.session.sd = print;
    console.log(m2.address);
    req.session.add1 = m2.address;
    res.redirect('/dash');
});
app.get('/auto', async (req, res) => {
    console.log(`Our client is connected: ${api.isConnected}`);
    const { account: m2, mnemonic } = createAccount();
    const balance = await api.derive.balances.all(m2.address);
    const available = balance.availableBalance.toNumber();
    const dots = available / (10 ** api.registry.chainDecimals);
    const print = dots.toFixed(4);
    req.session.sd = print;
    req.session.mn = mnemonic;
    console.log(m2.address);
    req.session.add1 = m2.address;
    res.render('next', { phrase1: mnemonic });
});


app.listen(2000, () => {
    console.log('Server is running on port 3000');
});
