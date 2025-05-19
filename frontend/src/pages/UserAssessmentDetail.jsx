// src/pages/UserAssessmentDetail.jsx
import {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';

const UserAssessmentDetail = () => {
    const {id} = useParams();
    const [userAssessment, setUserAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');
    const API_BASE = 'http://localhost:8001/api';

    useEffect(() => {
        fetch(`${API_BASE}/user-assessments/${id}/`, {
            headers: {'Authorization': `Token ${token}`}
        })
            .then(res => res.json())
            .then(data => {
                setUserAssessment(data);
                setLoading(false);
            });
    }, [id, token]);

    const handleAnswerChange = async (answerId, newAnswer) => {
        const res = await fetch(`${API_BASE}/user-assessments/answers/${answerId}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
            body: JSON.stringify({answer: newAnswer}),
        });

        if (res.ok) {
            setUserAssessment(prev => {
                const updatedAnswers = prev.answers.map(a =>
                    a.id === answerId ? {...a, answer: newAnswer} : a
                );
                return {...prev, answers: updatedAnswers};
            });
        } else {
            alert('Error al actualizar la respuesta');
        }
    };

    if (loading) return <div>Cargando assessment...</div>;
    if (!userAssessment) return <div>No se encontró el assessment.</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">{userAssessment.assessment_template.title}</h1>
            <ul>
                {userAssessment.answers.map(answer => (
                    <li key={answer.id} className="mb-4 p-4 border rounded shadow">
                        <p className="mb-2">{answer.question_template.text}</p>
                        <select
                            value={answer.answer || ''}
                            onChange={(e) => handleAnswerChange(answer.id, e.target.value)}
                            className="border p-2 rounded"
                        >
                            <option value="">-- Elige una respuesta --</option>
                            <option value="YES">Sí</option>
                            <option value="NO">No</option>
                            <option value="NA">No Aplica</option>
                            <option value="ALT">Alternativa</option>
                        </select>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default UserAssessmentDetail;
