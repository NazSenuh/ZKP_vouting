const { groth16 } = require('snarkjs');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const circomlibjs = require('circomlibjs');
const path = require('path');

const TREE_LEVELS = 10; // Match circuit's levels

const app = express();
app.use(express.json());
app.use(cors());

function readVotersFile() {
    const filePath = path.resolve(__dirname, '..', 'voters.json');
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify([]));
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        const voters = data.trim() ? JSON.parse(data) : [];
        console.log('Loaded voters:', voters);
        return voters;
    } catch (error) {
        console.error('Error reading voters.json at', filePath, ':', error.message);
        fs.writeFileSync(filePath, JSON.stringify([]));
        return [];
    }
}

async function buildMerkleTree(voters) {
    const poseidon = await circomlibjs.buildPoseidon();
    const F = poseidon.F;

    // Initialize 2^10 leaves with Poseidon hash of 0 as default
    const defaultLeaf = F.toObject(poseidon([BigInt(0)]));
    const leaves = Array(2 ** TREE_LEVELS).fill(defaultLeaf);

    // Fill leaves with voter identity commitments
    voters.forEach((voter, index) => {
        if (index < 2 ** TREE_LEVELS) {
            leaves[index] = F.toObject(poseidon([BigInt(voter.identitySecret)]));
        }
    });

    let currentLevel = leaves;
    while (currentLevel.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < currentLevel.length; i += 2) {
            const left = currentLevel[i];
            const right = currentLevel[i + 1] || left;
            nextLevel.push(F.toObject(poseidon([left, right])));
        }
        currentLevel = nextLevel;
    }
    return { root: currentLevel[0].toString(), leaves };
}

async function generateProof(input) {
    const poseidon = await circomlibjs.buildPoseidon();
    const F = poseidon.F;

    const voters = readVotersFile();
    const { root: treeRoot, leaves } = await buildMerkleTree(voters);
    const voter = voters.find(v => v.identitySecret === input.identitySecret); // Compare strings
    if (!voter) throw new Error('Voter not found');

    const identitySecretBigInt = BigInt(input.identitySecret); // Convert to BigInt for Poseidon
    const identityCommitment = poseidon([identitySecretBigInt]);

    const leafIndex = voters.findIndex(v => v.identitySecret === input.identitySecret); // Compare strings
    let pathElements = [];
    let pathIndices = [];
    let currentLevel = [...leaves];

    for (let level = 0; level < TREE_LEVELS; level++) {
        const index = Math.floor(leafIndex / Math.pow(2, level)) % 2; // 0 for left, 1 for right
        pathIndices.push(index);
        const siblingIndex = Math.floor(leafIndex / Math.pow(2, level)) ^ 1; // XOR to get sibling index
        const sibling = currentLevel[siblingIndex] || currentLevel[leafIndex]; // Fallback if out of bounds
        pathElements.push(sibling.toString());

        // Compute next level for validation
        const nextLevel = [];
        for (let i = 0; i < currentLevel.length; i += 2) {
            const left = currentLevel[i];
            const right = currentLevel[i + 1] || left;
            nextLevel.push(F.toObject(poseidon([left, right])));
        }
        currentLevel = nextLevel;
    }

    // Validate vote
    const vote = typeof input.vote === 'string' ? parseInt(input.vote) : input.vote;
    if (vote !== 0 && vote !== 1) throw new Error('Vote must be 0 or 1');

    const fullInput = {
        identitySecret: identitySecretBigInt.toString(),
        vote: Number(vote),
        pathIndices,
        pathElements: pathElements.map(x => x.toString()),
        treeRoot,
        signalHash: BigInt(input.signalHash || '789').toString()
    };


    const wasmPath = path.join(__dirname, '..', 'circuits', 'circuit_js', 'circuit_js', 'circuit.wasm');
    const zkeyPath = path.join(__dirname, '..', 'circuits', 'circuit_js', 'circuit_js', 'circuit_final.zkey');

    

    console.log("TYPE OF VOTE:", typeof vote, "VALUE:", vote);

    const { proof, publicSignals } = await groth16.fullProve(fullInput, wasmPath, zkeyPath);
    fs.writeFileSync("proof.json", JSON.stringify(proof, null, 2));
    fs.writeFileSync("public.json", JSON.stringify(publicSignals, null, 2));
    return { proof, publicSignals };
}

app.post('/generate-proof', async (req, res) => {
    console.log('Received request:', req.body);
    try {
        const voters = readVotersFile();
        const voter = voters.find(v => v.identitySecret === req.body.identitySecret);
        if (!voter) throw new Error('Voter not found');
        if (voter.vote !== null) throw new Error('Voter has already voted'); 

        const { proof, publicSignals } = await generateProof(req.body);
        const response = await fetch('http://localhost:3000/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proof, publicSignals })
        });
        const result = await response.json();

        // Оновіть статус голосування після успішної перевірки
        if (result.verified) {
            voter.vote = Number(req.body.vote); // Зберігайте голос (0 або 1)
            fs.writeFileSync(path.resolve(__dirname, '..', 'voters.json'), JSON.stringify(voters, null, 2));
        }

        res.json({ message: 'Proof generated and verified', verification: result });
    } catch (error) {
        console.error('Proof generation error:', error.message);
        res.status(500).json({ error: 'Proof generation failed: ' + error.message });
    }
});

app.get('/voters', (req, res) => {
    const voters = readVotersFile();
    res.json(voters);
});

app.post('/register-voter', (req, res) => {
    const { identitySecret } = req.body;
    const voters = readVotersFile();
    if (voters.find(v => v.identitySecret === identitySecret)) {
        return res.status(400).json({ error: 'Voter already registered' });
    }
    voters.push({ id: voters.length, identitySecret, vote: null });
    try {
        fs.writeFileSync('../voters.json', JSON.stringify(voters, null, 2));
        res.json({ message: 'Voter registered' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save voter' });
    }
});

app.listen(3001, () => console.log('Client server running on port 3001'));