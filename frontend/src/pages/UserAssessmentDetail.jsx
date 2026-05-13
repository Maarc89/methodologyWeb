import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import AssessmentAnalysis from '../functionalities/AssessmentAnalysis.jsx';
import { downloadCSV } from "../functionalities/ExportAssessment.jsx";
import { fetchWithAuth } from '../utils/api.js';
import { API_BASE } from "../config.js";
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { Loading, ErrorState } from '../components/ui/States.jsx';

const UserAssessmentDetail = () => {
    const { id } = useParams();
    const location = useLocation();
    const isAdminView = new URLSearchParams(location.search).get('admin') === '1';
    const [userAssessment, setUserAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [openAreas, setOpenAreas] = useState({});
    const [markedForReview, setMarkedForReview] = useState({});
    const [savingAnswerId, setSavingAnswerId] = useState(null);
    const [finalizing, setFinalizing] = useState(false);
    const [finalized, setFinalized] = useState(false);
    const [assessmentAnalysis, setAssessmentAnalysis] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [isAdminUser, setIsAdminUser] = useState(false);

    useEffect(() => {
        const fetchAssessment = async () => {
            setLoading(true);
            setErrorMsg('');

            // Obtener info del usuario para saber si es admin (is_staff o in group 'admin')
            let isAdminLocal = false;
            try {
                const meRes = await fetchWithAuth(`${API_BASE}/users/me/`);
                if (meRes.ok) {
                    const me = await meRes.json();
                    isAdminLocal = Boolean(me.is_staff) || Boolean(me.is_admin);
                    setIsAdminUser(isAdminLocal);
                }
            } catch (err) {
                console.debug('No se pudo obtener info de usuario para determinar permisos', err);
            }

            try {
                const detailUrl = isAdminView ? `${API_BASE}/admin/user-assessments/${id}/` : `${API_BASE}/user-assessments/${id}/`;
                const res = await fetchWithAuth(detailUrl);
                if (!res.ok) throw new Error(`Error al cargar la evaluación: ${res.statusText}`);
                let data = await res.json();

                // Normalizar las respuestas para que `selected_option` sea siempre el objeto de la opción
                // (backend puede devolver solo el id en algunos casos). También normalizamos tipos de id.
                if (Array.isArray(data.answers)) {
                    data = {
                        ...data,
                        answers: data.answers.map(ans => {
                            const qtOptions = (ans.question_template && ans.question_template.options) || [];
                            let selected = ans.selected_option;
                            // Si selected_option es un id o tiene campo id pero no es el objeto completo
                            if (selected && typeof selected !== 'object') {
                                selected = qtOptions.find(o => String(o.id) === String(selected)) || null;
                            } else if (selected && typeof selected === 'object' && selected.id && !qtOptions.find(o => String(o.id) === String(selected.id))) {
                                // selected tiene id pero options no lo contienen (edge case) -> leave as-is
                                // convert id to string for later comparisons
                                selected = { ...selected, id: selected.id };
                            }

                            return {
                                ...ans,
                                selected_option: selected ? selected : null,
                                // ensure question_template.options id types are normalized to strings for safe comparisons
                                question_template: {
                                    ...ans.question_template,
                                    options: qtOptions.map(o => ({ ...o }))
                                }
                            };
                        })
                    };
                }

                setUserAssessment(data);

                if (data.completed) {
                    setFinalized(true);

                    // Solo cargar análisis si es admin (o estamos en admin view)
                    if (isAdminView || isAdminLocal) {
                        const analysisUrl = `${API_BASE}/user-assessments/${id}/analysis/`;
                        try {
                            const resAnalysis = await fetchWithAuth(analysisUrl);
                            if (resAnalysis.ok) {
                                const analysisData = await resAnalysis.json();
                                setAssessmentAnalysis(analysisData);
                            } else if (resAnalysis.status === 403) {
                                // No permitido
                                setAssessmentAnalysis(null);
                            } else {
                                setErrorMsg('No se pudo cargar el análisis');
                            }
                        } catch (err) {
                            console.error('Error al obtener análisis:', err);
                            setErrorMsg('No se pudo cargar el análisis');
                        }
                    }
                }
            } catch (err) {
                console.error(err);
                setErrorMsg('No se pudo cargar la evaluación.');
            } finally {
                setLoading(false);
            }
        };

        fetchAssessment();
    }, [id]);

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
            const res = await fetchWithAuth(`${API_BASE}/user-assessments/answers/${answerId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selected_option: newSelectedOption.id })
            });

            if (!res.ok) throw new Error('Error al actualizar la respuesta');

            setUserAssessment(prev => {
                const updatedAnswers = prev.answers.map(a =>
                    a.id === answerId ? { ...a, selected_option: newSelectedOption } : a
                );
                return { ...prev, answers: updatedAnswers };
            });
        } catch (err) {
            console.error(err);
            setErrorMsg('Error al actualizar la respuesta');
        } finally {
            setSavingAnswerId(null);
        }
    };

    const toggleArea = (area) => {
        setOpenAreas(prev => ({ ...prev, [area]: !prev[area] }));
    };

    const toggleReview = (questionId) => {
        setMarkedForReview(prev => ({ ...prev, [questionId]: !prev[questionId] }));
    };

    const handleFinalizeAssessment = async () => {
        setFinalizing(true);
        setErrorMsg('');
        try {
            const res = await fetchWithAuth(`${API_BASE}/user-assessments/${id}/finalize/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ marked_for_review: markedForReview })
            });

            if (!res.ok) throw new Error('Error al finalizar la evaluación');
            setFinalized(true);

            // Re-fetch the full assessment to ensure we display the persisted selections
            try {
                const detailUrl = isAdminView ? `${API_BASE}/admin/user-assessments/${id}/` : `${API_BASE}/user-assessments/${id}/`;
                const refreshRes = await fetchWithAuth(detailUrl);
                if (refreshRes.ok) {
                    let refreshed = await refreshRes.json();
                    // normalize same as initial load
                    if (Array.isArray(refreshed.answers)) {
                        refreshed = {
                            ...refreshed,
                            answers: refreshed.answers.map(ans => {
                                const qtOptions = (ans.question_template && ans.question_template.options) || [];
                                let selected = ans.selected_option;
                                if (selected && typeof selected !== 'object') {
                                    selected = qtOptions.find(o => String(o.id) === String(selected)) || null;
                                }
                                return { ...ans, selected_option: selected ? selected : null };
                            })
                        };
                    }
                    setUserAssessment(refreshed);
                }
            } catch (err) {
                console.warn('No se pudo refrescar la evaluación tras finalizar:', err);
            }
        } catch (err) {
            console.error(err);
            setErrorMsg('Error al finalizar la evaluación');
        } finally {
            setFinalizing(false);
        }
    };

    const groupedByArea = React.useMemo(() => {
        const groups = {};
        (userAssessment?.answers ?? []).forEach(answer => {
            const area = answer.question_template.area || 'Sin área';
            if (!groups[area]) groups[area] = [];
            groups[area].push(answer);
        });
        return groups;
    }, [userAssessment]);

    if (loading) return <Loading label="Cargando la evaluación…" />;
    if (!userAssessment) return <ErrorState title="No encontrada" message="No se encontró la evaluación." onRetry={() => window.location.reload()} />;

    return (
        <div className="container-main">
            <h1 className="text-2xl font-bold mb-2 dark:text-gray-100">
                {userAssessment.assessment_template?.title ?? 'Evaluación'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {userAssessment.assessment_template?.description}
            </p>

            {/* Mostrar usuario (snapshot o real) */}
            <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
                <strong>Usuario:</strong> {userAssessment.user_username || 'Usuario desconocido'}{userAssessment.user_email ? ` · ${userAssessment.user_email}` : ''}
                {userAssessment.user_anonymized ? (<span className="ml-2 text-xs text-gray-500">(anonimizado)</span>) : null}
            </div>

            {errorMsg && (
                <div className="mb-4 text-red-600 font-semibold">{errorMsg}</div>
            )}

            {Object.keys(groupedByArea).map(area => (
                <Card key={area} title={area} className="mb-4">
                    <div className="mb-3">
                        <Button variant="ghost" onClick={() => toggleArea(area)}>
                            {openAreas[area] ? 'Ocultar' : 'Mostrar'} preguntas
                        </Button>
                    </div>

                    {openAreas[area] && (
                        <ul className="grid gap-4">
                            {groupedByArea[area].map(answer => (
                                <li key={answer.id} className="p-4 border rounded-lg dark:border-gray-700">
                                    <p className="mb-2 font-medium dark:text-gray-100">
                                        {answer.question_template.text}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {answer.question_template.options.map(option => (
                                            <Button
                                                key={option.id}
                                                onClick={() => handleAnswerChange(answer.id, option.value)}
                                                disabled={savingAnswerId === answer.id || finalized}
                                                // Comparación robusta de ids (string)
                                                variant={answer.selected_option && String(answer.selected_option.id) === String(option.id) ? 'brand' : 'ghost'}
                                            >
                                                {option.label}
                                                {finalized && answer.selected_option && String(answer.selected_option.id) === String(option.id) && (
                                                    <span className="ml-2 text-green-600" aria-hidden="true">✓</span>
                                                )}
                                            </Button>
                                        ))}
                                        <Button
                                            onClick={() => toggleReview(answer.id)}
                                            disabled={finalized}
                                            variant={markedForReview[answer.id] ? 'success' : 'muted'}
                                            aria-label="Marcar para revisar"
                                        >
                                            ⚑
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            ))}

            {!finalized ? (
                <div className="mt-6">
                    <Button
                        onClick={handleFinalizeAssessment}
                        disabled={finalizing}
                        variant="success"
                    >
                        {finalizing ? 'Finalizando…' : 'Finalizar Evaluación'}
                    </Button>
                </div>
            ) : (
                <>
                    <div className="mt-6 text-green-700 dark:text-green-400 font-semibold">
                        Evaluación finalizada.
                    </div>
                    { (isAdminView || isAdminUser) && (
                        assessmentAnalysis ? (
                            <Card className="mt-4" title="Análisis de la Evaluación">
                                <AssessmentAnalysis userAssessmentId={id} />
                            </Card>
                        ) : (
                            <div className="mt-4">Cargando análisis...</div>
                        )
                    )}
                    <Button
                        onClick={() =>
                            downloadCSV(
                                `${API_BASE}/export-user-assessment-csv/${id}/`,
                                `assessment_${id}.csv`
                            )
                        }
                        variant="confirm"
                        className="mt-4 btn-confirm"
                    >
                        Exportar en formato CSV
                    </Button>
                </>
            )}
        </div>
    );
};

export default UserAssessmentDetail;
