import React, { useState } from 'react';

const VoterRegistration = ({ refreshVoters }) => {
    const [newIdentitySecret, setNewIdentitySecret] = useState('');
    const [message, setMessage] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        setMessage('Registering voter...');

        try {
            const response = await fetch('http://localhost:3001/register-voter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identitySecret: newIdentitySecret })
            });

            const result = await response.json();
            if (result.error) {
                setMessage(result.error);
            } else {
                setMessage('Voter registered successfully!');
                setNewIdentitySecret('');
                refreshVoters();
            }
        } catch (error) {
            setMessage('Error registering voter: ' + error.message);
        }
    };

    return (
        <div className="voting-form">
            <button
                onClick={() => setNewIdentitySecret('')}
                className="button"
            >
                Register New Voter
            </button>

            <form onSubmit={handleRegister}>
                <div>
                    <label>New Identity Secret</label>
                    <input
                        type="text"
                        value={newIdentitySecret}
                        onChange={(e) => setNewIdentitySecret(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Register Voter</button>
            </form>

            {message && <p className="message">{message}</p>}
        </div>
    );
};

export default VoterRegistration;