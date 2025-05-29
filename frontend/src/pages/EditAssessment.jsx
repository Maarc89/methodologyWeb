import {useState, useEffect} from 'react';
import {useParams, useNavigate} from 'react-router-dom';

const API_BASE = 'http://localhost:8001/api';

const EditAssessment = () => {
    const {id} = useParams();
    const navigate = useNavigate();

    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Campos editables (ejemplo: title, description)
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    // Cargar datos de la assessment
    useEffect(() => {
        fetch(`${API_BASE}/assessments/${id}/`, {
            headers: {
                'Authorization': `Token ${localStorage.getItem('token')}`,
            }
        })
            .then(res => {
                if (!res.ok) throw new Error('Error al cargar la assessment');
                return res.json();
            })
            .then(data => {
                setAssessment(data);
                setTitle(data.title);
                setDescription(data.description);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [id]);

    // Guardar cambios
    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);

        fetch(`${API_BASE}/assessments/${id}/`, {
            method: 'PUT', // o PATCH si solo actualizas campos
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({title, description}),
        })
            .then(res => {
                if (!res.ok) throw new Error('Error al actualizar');
                return res.json();
            })
            .then(data => {
                console.log(data);
                alert('Assessment actualizada correctamente');
                navigate('/'); // Redirige a home o a la página que quieras
            })
            .catch(err => setError(err.message));
    };

    if (loading) return <p>Cargando...</p>;
    if (error) return <p className="text-red-600">Error: {error}</p>;

    return (
        <div className="max-w-2xl mx-auto mt-10 p-6 border rounded shadow bg-white">
            <h1 className="text-2xl font-bold mb-4">Editar Assessment</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block font-semibold mb-1" htmlFor="title">Título</label>
                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full border rounded p-2"
                        required
                    />
                </div>

                <div>
                    <label className="block font-semibold mb-1" htmlFor="description">Descripción</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full border rounded p-2"
                        rows={4}
                    />
                </div>

                <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Guardar Cambios
                </button>
            </form>
        </div>
    );
};

export default EditAssessment;
