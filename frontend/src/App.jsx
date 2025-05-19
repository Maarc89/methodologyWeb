// src/App.jsx
import {useState} from 'react';
import {Routes, Route} from 'react-router-dom';

import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import PrivateRoute from './routes/PrivateRoute';

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

    const handleLoginSuccess = (token) => {
        localStorage.setItem('token', token);
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
    };

    return (
        <Routes>
            <Route path="/" element={<Layout isAuthenticated={isAuthenticated}/>}>
                <Route index element={<div>Bienvenido a tu página principal</div>}/>
                <Route path="login" element={<Login onLoginSuccess={handleLoginSuccess}/>}/>
                <Route path="register" element={<Register onRegisterSuccess={handleLoginSuccess}/>}/>
                <Route
                    path="profile"
                    element={
                        <PrivateRoute>
                            <Profile onLogout={handleLogout}/>
                        </PrivateRoute>
                    }
                />
            </Route>
        </Routes>
    );
};

export default App;
