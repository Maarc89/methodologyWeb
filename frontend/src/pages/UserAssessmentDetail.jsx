import {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import AssessmentAnalysis from '../functionalities/AssessmentAnalysis.jsx';
import {downloadCSV} from "../functionalities/ExportAssessment.jsx";

const UserAssessmentDetail = () => {
    const {id} = useParams();
    const [userAssessment, setUserAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [openAreas, setOpenAreas] = useState({});
    const [markedForReview, setMarkedForReview] = useState({});
    const [savingAnswerId, setSavingAnswerId] = useState(null);
    const [finalizing, setFinalizing] = useState(false);
    const [finalized, setFinalized] = useState(false);
    const [assessmentAnalysis, setAssessmentAnalysis] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const token = localStorage.getItem('token');
    const API_BASE = 'http://localhost:8001/api';

    useEffect(() => {
        if (!token) {
            setErrorMsg('No hay token de autenticación');
            setLoading(false);
            return;
        }

        setLoading(true);
        setErrorMsg('');

        fetch(`${API_BASE}/user-assessments/${id}/`, {
            headers: {Authorization: `Token ${token}`},
        })
            .then(res => {
                if (!res.ok) throw new Error(`Error al cargar assessment: ${res.statusText}`);
                return res.json();
            })
            .then(async data => {
                console.log('Assessment recibido:', data);
                setUserAssessment(data);

                if (data.completed) {
                    setFinalized(true);

                    try {
                        const resAnalysis = await fetch(`${API_BASE}/user-assessments/${id}/analysis/`, {
                            headers: {Authorization: `Token ${token}`},
                        });
                        if (resAnalysis.ok) {
                            const analysisData = await resAnalysis.json();
                            setAssessmentAnalysis(analysisData);
                        } else {
                            setErrorMsg('No se pudo cargar el análisis');
                        }
                    } catch (err) {
                        console.error('No se pudo cargar el análisis:', err);
                        setErrorMsg('Error cargando análisis');
                    }
                }

                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setErrorMsg('No se pudo cargar el assessment.');
                setLoading(false);
            });
    }, [id, token]);

    const handleAnswerChange = async (answerId, newAnswerValue) => {
        const answerObj = userAssessment.answers.find(a => a.id === answerId);
        const currentAnswer = answerObj?.selected_option?.value;
        if (currentAnswer === newAnswerValue) return;

        setSavingAnswerId(answerId);
        setErrorMsg('');

        const options = answerObj.question_template.options;
        const newSelectedOption = options?.find(opt => opt.value === newAnswerValue);

        if (!newSelectedOption) {
            setErrorMsg('Opción seleccionada no válida');
            setSavingAnswerId(null);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/user-assessments/answers/${answerId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Token ${token}`,
                },
                body: JSON.stringify({selected_option: newSelectedOption.id})
            });

            if (!res.ok) throw new Error('Error al actualizar la respuesta');

            setUserAssessment(prev => {
                const updatedAnswers = prev.answers.map(a => {
                    if (a.id === answerId) {
                        return {...a, selected_option: newSelectedOption};
                    }
                    return a;
                });
                return {...prev, answers: updatedAnswers};
            });
        } catch (err) {
            console.error(err);
            setErrorMsg('Error al actualizar la respuesta');
        } finally {
            setSavingAnswerId(null);
        }
    };

    const toggleArea = (area) => {
        setOpenAreas(prev => ({
            ...prev,
            [area]: !prev[area]
        }));
    };

    const toggleReview = (questionId) => {
        setMarkedForReview(prev => ({
            ...prev,
            [questionId]: !prev[questionId]
        }));
    };

    const handleFinalizeAssessment = async () => {
        setFinalizing(true);
        setErrorMsg('');
        try {
            const res = await fetch(`${API_BASE}/user-assessments/${id}/finalize/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Token ${token}`,
                },
                body: JSON.stringify({marked_for_review: markedForReview}) // aquí envías el estado
            });

            if (!res.ok) throw new Error('Error al finalizar assessment');

            setFinalized(true);

            const resAnalysis = await fetch(`${API_BASE}/user-assessments/${id}/analysis/`, {
                headers: {Authorization: `Token ${token}`},
            });
            if (resAnalysis.ok) {
                const analysisData = await resAnalysis.json();
                setAssessmentAnalysis(analysisData);
            } else {
                setErrorMsg('No se pudo cargar el análisis después de finalizar');
            }
        } catch (err) {
            console.error(err);
            setErrorMsg('Error al finalizar assessment');
        } finally {
            setFinalizing(false);
        }
    };


    if (loading) return <div>Cargando assessment...</div>;
    if (!userAssessment) return <div>No se encontró el assessment.</div>;

    const groupedByArea = {};
    (userAssessment?.answers ?? []).forEach(answer => {
        const area = answer.question_template.area || 'Sin área';
        if (!groupedByArea[area]) groupedByArea[area] = [];
        groupedByArea[area].push(answer);
    });

    if (loading) return <div>Cargando assessment...</div>;
    if (!userAssessment) return <div>No se encontró el assessment.</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">
                {userAssessment.assessment_template?.title ?? 'Assessment'}
            </h1>
            <p className="text-sm text-gray-600 mb-2">
                {userAssessment.assessment_template?.description}
            </p>

            {errorMsg && (
                <div className="mb-4 text-red-600 font-semibold">{errorMsg}</div>
            )}

            {Object.keys(groupedByArea).map(area => (
                <div key={area} className="mb-4 border rounded shadow">
                    <button
                        onClick={() => toggleArea(area)}
                        className="w-full text-left px-4 py-3 bg-gray-100 hover:bg-gray-200 font-semibold"
                    >
                        {area} {openAreas[area] ? '▲' : '▼'}
                    </button>

                    {openAreas[area] && (
                        <ul className="p-4">
                            {groupedByArea[area].map(answer => (
                                <li key={answer.id} className="mb-4 p-4 border rounded">
                                    <p className="mb-2 font-medium">
                                        {answer.question_template.text}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {answer.question_template.options.map(option => (
                                            <button
                                                key={option.id}
                                                onClick={() => handleAnswerChange(answer.id, option.value)}
                                                disabled={savingAnswerId === answer.id || finalized}
                                                className={`py-2 px-4 rounded transition 
                                                ${answer.selected_option?.id === option.id
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-200 hover:bg-blue-100'}`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => toggleReview(answer.id)}
                                            disabled={finalized}
                                            className={`ml-2 py-1 px-3 rounded border 
        ${markedForReview[answer.id] ? 'bg-yellow-400 text-white' : 'bg-gray-100 hover:bg-yellow-100'}
        ${finalized ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            🚩
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ))}

            {!finalized ? (
                <div className="mt-6">
                    <button
                        onClick={handleFinalizeAssessment}
                        disabled={finalizing}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                        {finalizing ? 'Finalizando...' : 'Finalizar Evaluación'}
                    </button>
                </div>
            ) : (
                <>
                    <div className="mt-6 text-green-700 font-semibold">
                        Assessment finalizado.
                    </div>
                    {assessmentAnalysis ? (
                        <div className="mt-4 p-4 border rounded bg-gray-100">
                            <h2 className="text-xl font-bold mb-2">Análisis del Assessment</h2>
                            <AssessmentAnalysis userAssessmentId={id}/>
                        </div>
                    ) : (
                        <div className="mt-4">Cargando análisis...</div>
                    )}
                    <button
                        onClick={() =>
                            downloadCSV(
                                `${API_BASE}/export-user-assessment-csv/${id}/`,
                                `assessment_${id}.csv`
                            )
                        }
                        className="btn-confirm"
                    >
                        Exportar en formato CSV
                    </button>
                </>
            )}
        </div>
    );
};

export default UserAssessmentDetail;
