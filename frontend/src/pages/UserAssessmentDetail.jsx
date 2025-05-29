import {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';

const UserAssessmentDetail = () => {
    const {id} = useParams();
    const [userAssessment, setUserAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingAnswerId, setSavingAnswerId] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const token = localStorage.getItem('token');
    const API_BASE = 'http://localhost:8001/api';

    useEffect(() => {
        setLoading(true);
        fetch(`${API_BASE}/user-assessments/${id}/`, {
            headers: {'Authorization': `Token ${token}`}
        })
            .then(res => {
                if (!res.ok) throw new Error('Error al cargar assessment');
                return res.json();
            })
            .then(data => {
                setUserAssessment(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setErrorMsg('No se pudo cargar el assessment.');
                setLoading(false);
            });
    }, [id, token]);

    const handleAnswerChange = async (answerId, newAnswer) => {
        const currentAnswer = userAssessment.answers.find(a => a.id === answerId)?.answer;
        if (currentAnswer === newAnswer) return; // no hacer nada si es la misma respuesta

        setSavingAnswerId(answerId);
        setErrorMsg('');

        try {
            const res = await fetch(`${API_BASE}/user-assessments/answers/${answerId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`
                },
                body: JSON.stringify({answer: newAnswer}),
            });

            if (!res.ok) throw new Error('Error al actualizar la respuesta');

            setUserAssessment(prev => {
                const updatedAnswers = prev.answers.map(a =>
                    a.id === answerId ? {...a, answer: newAnswer} : a
                );
                return {...prev, answers: updatedAnswers};
            });
        } catch {
            setErrorMsg('Error al actualizar la respuesta');
        } finally {
            setSavingAnswerId(null);
        }
    };

    if (loading) return <div>Cargando assessment...</div>;
    if (!userAssessment) return <div>No se encontró el assessment.</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">{userAssessment.assessment_template.title}</h1>
            {errorMsg && (
                <div className="mb-4 text-red-600 font-semibold">{errorMsg}</div>
            )}
            <ul>
                {userAssessment.answers.map(answer => (
                    <li key={answer.id} className="mb-4 p-4 border rounded shadow">
                        <p className="mb-2 font-medium">{answer.question_template.text}</p>
                        <div className="flex flex-wrap gap-2">
                            {['YES', 'NO', 'NA', 'ALT'].map(option => (
                                <button
                                    key={option}
                                    onClick={() => handleAnswerChange(answer.id, option)}
                                    disabled={savingAnswerId === answer.id}
                                    className={`py-2 px-4 rounded-lg transition-all duration-200
                                        ${answer.answer === option
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-800 hover:bg-blue-100'}`}
                                >
                                    {option === 'YES' && 'Sí'}
                                    {option === 'NO' && 'No'}
                                    {option === 'NA' && 'No Aplica'}
                                    {option === 'ALT' && 'Alternativa'}
                                </button>
                            ))}
                            {savingAnswerId === answer.id && (
                                <span className="ml-2 text-sm text-gray-500 italic">Guardando...</span>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default UserAssessmentDetail;
