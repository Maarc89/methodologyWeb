import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';

const MyAssessments = () => {
    const [userAssessments, setUserAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        fetch('http://localhost:8001/api/user-assessments/', {
            headers: {'Authorization': `Token ${token}`}
        })
            .then(res => res.json())
            .then(data => {
                setUserAssessments(data);
                setLoading(false);
            });
    }, [navigate, token]);

    if (loading) return <div>Cargando tus assessments...</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Mis Assessments</h1>
            <ul>
                {userAssessments.length === 0 && <p>No has empezado ningún assessment.</p>}
                {userAssessments.map(ua => (
                    <li key={ua.id} className="mb-3 p-4 border rounded shadow">
                        <h2 className="font-semibold text-xl">{ua.assessment_template.title}</h2>
                        <button
                            className="mt-2 px-4 py-2 bg-green-600 text-white rounded"
                            onClick={() => navigate(`/user-assessments/${ua.id}`)}
                        >
                            Continuar
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default MyAssessments;
