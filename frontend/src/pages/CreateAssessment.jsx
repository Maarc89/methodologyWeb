import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

const CreateAssessment = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const API_BASE = 'http://localhost:8001/api';

    const handleSubmit = async (e) => {
        e.preventDefault();

        const res = await fetch(`${API_BASE}/assessments/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
            body: JSON.stringify({title, description})
        });

        if (res.ok) {
            alert('Assessment creado correctamente');
            navigate('/');
        } else {
            alert('Error al crear el assessment');
        }
    };

    return (
        <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-4">Crear nuevo Assessment</h1>
            <form onSubmit={handleSubmit}>
                <label className="block mb-2 font-semibold">Título</label>
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    className="w-full mb-4 p-2 border rounded"
                />

                <label className="block mb-2 font-semibold">Descripción</label>
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full mb-4 p-2 border rounded"
                />

                <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Crear
                </button>
            </form>
        </div>
    );
};

export default CreateAssessment;
