import {useState} from 'react';
import {Routes, Route} from 'react-router-dom';

import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import PrivateRoute from './routes/PrivateRoute';
import Home from './pages/Home';
import MyAssessments from './pages/MyAssessments';
import UserAssessmentDetail from './pages/UserAssessmentDetail';
import CreateAssessment from './pages/CreateAssessment';
import Settings from './pages/Settings';
import EditAssessment from './pages/EditAssessment';

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
                <Route index element={<Home/>}/>
                <Route path="login" element={<Login onLoginSuccess={handleLoginSuccess}/>}/>
                <Route path="register" element={<Register onRegisterSuccess={handleLoginSuccess}/>}/>
                <Route path="/create-assessment" element={<CreateAssessment/>}/>
                <Route path="/assessments/:id/edit" element={<EditAssessment/>}/>
                <Route
                    path="profile"
                    element={
                        <PrivateRoute>
                            <Profile onLogout={handleLogout}/>
                        </PrivateRoute>
                    }
                />
                <Route
                    path="my-assessments"
                    element={
                        <PrivateRoute>
                            <MyAssessments/>
                        </PrivateRoute>
                    }
                />
                <Route
                    path="user-assessments/:id"
                    element={
                        <PrivateRoute>
                            <UserAssessmentDetail/>
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/settings"
                    element={
                        <PrivateRoute>
                            <Settings/>
                        </PrivateRoute>
                    }
                />
            </Route>
        </Routes>
    );
};

export default App;
