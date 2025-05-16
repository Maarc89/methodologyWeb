import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import {useState} from 'react';

import Home from './pages/Home';
import AssessmentDetail from './pages/AssessmentDetail'; // la crearemos luego
import Login from './pages/Login';
import ProtectedRoute from './pages/AssessmentDetail';
import Register from './pages/Register';
import Profile from './pages/Profile';

function App() {
    const [token, setToken] = useState(localStorage.getItem('token') || null);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setToken(null);
    };

    return (
        <Router>
            <Routes>
                <Route
                    path="/"
                    element={
                        <Home
                            token={token}
                            setToken={setToken}
                            onLogout={handleLogout}
                        />
                    }
                />
                <Route
                    path="/login"
                    element={<Login onLoginSuccess={setToken}/>}
                />
                <Route
                    path="/register"
                    element={<Register onRegisterSuccess={setToken}/>}
                />
                <Route
                    path="/profile"
                    element={<Profile onLogout={handleLogout}/>}
                />
                <Route
                    path="/assessment/:id"
                    element={
                        <ProtectedRoute>
                            <AssessmentDetail/>
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </Router>
    );
}

export default App;
