// src/pages/Home.jsx
import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';

const Home = () => {
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const API_BASE = 'http://localhost:8001/api';

    useEffect(() => {
        const fetchAssessments = async () => {
            try {
                const res = await fetch(`${API_BASE}/assessments/`);
                if (!res.ok) throw new Error('Error al cargar assessments');
                const data = await res.json();
                setAssessments(data);
            } catch (error) {
                console.error(error);
                alert('No se pudieron cargar los assessments');
            } finally {
                setLoading(false);
            }
        };

        fetchAssessments();
    }, []);


    const handleStart = async (id) => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const res = await fetch(`${API_BASE}/user-assessments/start/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
            body: JSON.stringify({assessment_template_id: id}),
        });

        if (res.ok) {
            const data = await res.json();
            navigate(`/user-assessments/${data.id}`);
        } else {
            alert('Error al iniciar el assessment');
        }
    };

    if (loading) return <div>Cargando assessments...</div>;
    if (!loading && assessments.length === 0) {
        return <div>No hay assessments disponibles en este momento.</div>;
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Assessments disponibles</h1>
            <ul>
                {assessments.map(a => (
                    <li key={a.id} className="mb-3 p-4 border rounded shadow">
                        <h2 className="font-semibold text-xl">{a.title}</h2>
                        <button
                            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
                            onClick={() => handleStart(a.id)}
                        >
                            Empezar
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Home;
