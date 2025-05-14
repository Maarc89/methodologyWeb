import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import { Navigate } from 'react-router-dom';

const ANSWERS = ['YES', 'NO', 'NA', 'ALT'];

const AssessmentDetail = () => {
    const {id} = useParams();
    const [assessment, setAssessment] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch(`http://localhost:8001/api/assessments/${id}/`, {
            headers: {
                'Authorization': `Token ${token}`,
            }
        })
            .then(res => res.json())
            .then(data => setAssessment(data))
            .catch(err => console.error(err));
    }, [id]);

    const handleAnswer = (questionId, answer) => {
        const token = localStorage.getItem('token');
        fetch(`http://localhost:8000/api/questions/${questionId}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Token ${token}`
            },
            body: JSON.stringify({answer, is_answered: true}),
        })
            .then(res => res.json())
            .then(updatedQuestion => {
                setAssessment(prev => ({
                    ...prev,
                    questions: prev.questions.map(q =>
                        q.id === updatedQuestion.id ? updatedQuestion : q
                    )
                }));
            })
            .catch(err => console.error(err));
    };

    const ProtectedRoute = ({children}) => {
        const token = localStorage.getItem('token');

        if (!token) {
            return <Navigate to="/login"/>;
        }

        return children;
    };

    if (!assessment) return <p className="p-4">Cargando...</p>;

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">{assessment.title}</h1>
            {assessment.questions.length === 0 ? (
                <p>No hay preguntas.</p>
            ) : (
                <ul className="space-y-4">
                    {assessment.questions.map(question => (
                        <li key={question.id} className="border p-4 rounded shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <p className="font-medium">{question.text}</p>
                                {question.is_answered && <span className="text-green-500">✔️</span>}
                            </div>
                            <div className="space-x-2">
                                {ANSWERS.map(ans => (
                                    <button
                                        key={ans}
                                        onClick={() => handleAnswer(question.id, ans)}
                                        className={`px-3 py-1 rounded ${
                                            question.answer === ans
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 hover:bg-gray-300'
                                        }`}
                                    >
                                        {ans}
                                    </button>
                                ))}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AssessmentDetail;
