import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import VotingApp from './components/VotingApp';
import Results from './components/Results';

const App = () => {
    return (
        <Router>
            <nav className="nav-links">
                <Link to="/">Home</Link>
                <Link to="/results">Results</Link>
            </nav>
            <Routes>
                <Route path="/" element={<VotingApp />} />
                <Route path="/results" element={<Results />} />
            </Routes>
        </Router>
    );
};

export default App;