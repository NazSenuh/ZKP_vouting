import React, { useState } from 'react';

const VotingForm = ({ voters }) => {
    const [identitySecret, setIdentitySecret] = useState('');
    const [vote, setVote] = useState(0);
    const [message, setMessage] = useState('');

    const handleVote = async (e) => {
        e.preventDefault();
        setMessage('Generating proof...');

        try {
            const response = await fetch('http://localhost:3001/generate-proof', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identitySecret, vote })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Unknown error');
            }
            setMessage(result.message + (result.verification ? ` Verification: ${JSON.stringify(result.verification)}` : ''));
        } catch (error) {
            setMessage('Proof generation error: ' + error.message);
        }
    };

    return (
        <div className="voting-form">
            <h3>Cast Your Vote</h3>
            <form onSubmit={handleVote}>
                <div>
                    <label>Select Voter or Enter Secret</label>
                    <select
                        value={identitySecret}
                        onChange={(e) => setIdentitySecret(e.target.value)}
                    >
                        <option value="">-- Select Voter --</option>
                        {voters.map(v => (
                            <option key={v.id} value={v.identitySecret}>{v.identitySecret}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        value={identitySecret}
                        onChange={(e) => setIdentitySecret(e.target.value)}
                        placeholder="Or enter identity secret"
                        required
                    />
                </div>
                <div>
                    <label>Vote</label>
                    <select
                        value={vote}
                        onChange={(e) => setVote(parseInt(e.target.value))}
                    >
                        <option value="0">Vote for Option 0</option>
                        <option value="1">Vote for Option 1</option>
                    </select>
                </div>
                <button type="submit">Submit Vote</button>
            </form>
            {message && <p className="message">{message}</p>}
        </div>
    );
};

export default VotingForm;