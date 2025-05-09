import React, { useEffect, useState } from 'react';

const Results = () => {
    const [results, setResults] = useState({ option0: 0, option1: 0 });
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('http://localhost:3000/results')
            .then((res) => res.json())
            .then((data) => setResults(data))
            .catch((err) => setError('Failed to fetch results: ' + err.message));
    }, []);

    return (
        <div className="results-page">
            <h2>Voting Results</h2>
            {error && <p className="error">{error}</p>}
            <div className="results">
                <p>Option 0 Votes: {results.option0}</p>
                <p>Option 1 Votes: {results.option1}</p>
            </div>
        </div>
    );
};

export default Results;