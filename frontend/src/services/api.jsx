import axios from 'axios';

const API_URL = 'http://localhost:8000/api/';  // Cambia la URL según corresponda

// Función para obtener las preguntas
export const getQuestions = async () => {
    try {
        const response = await axios.get(`${API_URL}questions/`);
        return response.data;
    } catch (error) {
        console.error('Error fetching questions:', error);
        throw error;
    }
};

// Función para enviar las respuestas
export const submitAssessment = async (assessmentData) => {
    try {
        const response = await axios.post(`${API_URL}assessments/`, assessmentData);
        return response.data;
    } catch (error) {
        console.error('Error submitting assessment:', error);
        throw error;
    }
};
