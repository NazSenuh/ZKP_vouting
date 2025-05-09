import React, { useState, useEffect } from 'react';
import VoterRegistration from './VoterRegistration';
import VotingForm from './VotingForm';

const VotingApp = () => {
    const [voters, setVoters] = useState([]);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetch('http://localhost:3001/voters')
            .then(res => res.json())
            .then(data => setVoters(data))
            .catch(err => setMessage('Error fetching voters: ' + err.message));
    }, []);

    const refreshVoters = () => {
        fetch('http://localhost:3001/voters')
            .then(res => res.json())
            .then(data => setVoters(data))
            .catch(err => setMessage('Error fetching voters: ' + err.message));
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-gray-800">ZKP Voting System</h2>
            <VoterRegistration refreshVoters={refreshVoters} setMessage={setMessage} />
            <VotingForm voters={voters} setMessage={setMessage} />
            {message && <p className="text-center text-gray-600 mt-4">{message}</p>}
        </div>
    );
};

export default VotingApp;