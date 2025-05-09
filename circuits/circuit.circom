pragma circom 2.0.0;
include "circomlib/poseidon.circom";

template MerkleTreeInclusionProof(levels) {
    signal input leaf;
    signal input pathIndices[levels];
    signal input pathElements[levels];
    signal output root;

    signal nodes[levels + 1];
    nodes[0] <== leaf;

    component hash[levels];
    signal leftInput[levels];
    signal rightInput[levels];
    signal selector[levels];
    signal oneMinusSelector[levels];
    signal leftTerm[levels];
    signal rightTerm[levels];
    signal rightTerm1[levels];
    signal rightTerm2[levels];

    for (var i = 0; i < levels; i++) {
        hash[i] = Poseidon(2);

        // Define selector and compute 1 - selector[i] explicitly
        selector[i] <== pathIndices[i]; // 0 or 1
        oneMinusSelector[i] <== 1 - selector[i];

        // Compute leftInput using intermediate signals
        leftTerm[i] <== selector[i] * pathElements[i];
        rightTerm[i] <== oneMinusSelector[i] * nodes[i];
        leftInput[i] <== leftTerm[i] + rightTerm[i];

        // Compute rightInput using intermediate signals
        rightTerm1[i] <== selector[i] * nodes[i];
        rightTerm2[i] <== oneMinusSelector[i] * pathElements[i];
        rightInput[i] <== rightTerm1[i] + rightTerm2[i];

        hash[i].inputs[0] <== leftInput[i];
        hash[i].inputs[1] <== rightInput[i];

        nodes[i + 1] <== hash[i].out;
    }

    root <== nodes[levels];
}

template Voting(levels) {
    signal input identitySecret;
    signal input vote;
    signal input pathIndices[levels];
    signal input pathElements[levels];
    signal input treeRoot;
    signal input signalHash;
    signal output nullifier;
    signal output voteOut;

    // Ensure vote is 0 or 1
    signal voteValid;
    voteValid <== vote * (vote - 1);
    voteValid === 0;

    component poseidonId = Poseidon(1);
    poseidonId.inputs[0] <== identitySecret;
    signal identityCommitment;
    identityCommitment <== poseidonId.out;

    component tree = MerkleTreeInclusionProof(levels);
    tree.leaf <== identityCommitment;
    for (var i = 0; i < levels; i++) {
        tree.pathElements[i] <== pathElements[i];
        tree.pathIndices[i] <== pathIndices[i];
    }
    treeRoot === tree.root;

    component poseidonNullifier = Poseidon(2);
    poseidonNullifier.inputs[0] <== identitySecret;
    poseidonNullifier.inputs[1] <== signalHash;
    nullifier <== poseidonNullifier.out;

    voteOut <== vote;
}

component main { public [ treeRoot, signalHash ] } = Voting(10);