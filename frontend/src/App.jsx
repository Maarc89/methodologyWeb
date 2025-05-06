import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AssessmentDetail from './pages/AssessmentDetail'; // la crearemos luego

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/assessment/:id" element={<AssessmentDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
