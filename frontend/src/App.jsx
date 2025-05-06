import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Home from './pages/Home';
import AssessmentDetail from './pages/AssessmentDetail'; // la crearemos luego
import Login from './pages/Login';
import ProtectedRoute from './pages/AssessmentDetail';
import Register from './pages/Register';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home/>}/>
                <Route path="/login" element={<Login/>}/>
                <Route path="/assessment/:id" element={
                    <ProtectedRoute>
                        <AssessmentDetail/>
                    </ProtectedRoute>
                }/>
                <Route path="/register" element={<Register />} />
            </Routes>
        </Router>
    );
}

export default App;
