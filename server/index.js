const { groth16 } = require('snarkjs');
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const vkey = JSON.parse(fs.readFileSync('../circuits/verification_key.json'));

function readNullifiers() {
    const filePath = path.resolve(__dirname, 'nullifiers.json');
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify([]));
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return data.trim() ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error reading nullifiers.json:', error.message);
        return [];
    }
}

function saveNullifier(nullifier) {
    const nullifiers = readNullifiers();
    nullifiers.push(nullifier);
    fs.writeFileSync(path.resolve(__dirname, 'nullifiers.json'), JSON.stringify(nullifiers, null, 2));
}

app.post('/verify', async (req, res) => {
    try {
        const { proof, publicSignals } = req.body;
        console.log("Server Public Signals:", publicSignals);
        console.log("Server Proof:", proof);
        console.log("Server Verification Key:", vkey);

        const nullifier = publicSignals[0]; // Перший сигнал — це nullifier
        const nullifiers = readNullifiers();

        // Перевірка на подвійне голосування
        if (nullifiers.includes(nullifier)) {
            return res.json({ verified: false, error: 'Double voting detected' });
        }

        if (!proof || !publicSignals) {
            return res.status(400).json({ error: 'Proof and public signals are required' });
        }

        const result = await groth16.verify(vkey, publicSignals, proof);
        console.log("Verification Result:", result);

        // Зберігайте nullifier, якщо верифікація успішна
        if (result) {
            saveNullifier(nullifier);
        }

        res.json({ verified: result });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Verification failed', details: error.message });
    }
});

app.get('/results', (req, res) => {
    try {
        const voters = JSON.parse(fs.readFileSync('../voters.json', 'utf8'));
        const option0 = voters.filter(voter => voter.vote === 0).length;
        const option1 = voters.filter(voter => voter.vote === 1).length;
        res.json({ option0, option1 });
    } catch (error) {
        console.error('Error reading voters.json:', error.message);
        res.status(500).json({ error: 'Failed to calculate results' });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));