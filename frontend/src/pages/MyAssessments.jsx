import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { downloadCSV } from "../functionalities/ExportAssessment.jsx";
import { API_BASE } from "../config.js";
import { fetchWithAuth } from "../utils/api.js"; 
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import IconButton from '../components/ui/IconButton.jsx';
import { Loading, EmptyState, ErrorState } from '../components/ui/States.jsx';

const MyAssessments = () => {
  const [userAssessments, setUserAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAssessments = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/user-assessments/`);
        if (!res.ok) { setError('Error al cargar tus evaluaciones'); return; }
        const data = await res.json();
        setUserAssessments(data);
        setError('');
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar tus evaluaciones');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAssessments();
  }, [navigate]);

  if (loading) return <Loading label="Cargando tus evaluaciones…" />;
  if (error) return <ErrorState title="Error" message={error} onRetry={() => window.location.reload()} />;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Fecha no disponible';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDeleteAssessment = async (id) => {
    if (!window.confirm("¿Estás seguro de que quieres borrar esta evaluación?")) return;

    try {
      const res = await fetchWithAuth(`${API_BASE}/user-assessments/${id}/delete/`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setUserAssessments(prev => prev.filter(a => a.id !== id));
      } else {
        console.error("Error al eliminar la evaluación");
        alert("No se pudo eliminar la evaluación");
      }
    } catch (err) {
      console.error(err);
      alert("Error al eliminar la evaluación");
    }
  };

  return (
    <div className="container-main">
      <h1 className="text-2xl font-bold mb-4 dark:text-gray-100">Mis Evaluaciones</h1>
      {userAssessments.length === 0 ? (
        <EmptyState title="No has empezado ninguna evaluación" message="Cuando inicies una, aparecerá aquí." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userAssessments.map((ua) => (
            <Card key={ua.id} title={ua.name || ua.assessment_template.title} subtitle={`Creado el: ${formatDate(ua.started_at)}`}>
              <div className="flex flex-wrap gap-2">
                <Button variant="muted" onClick={() => navigate(`/user-assessments/${ua.id}`)}>Continuar</Button>
                {ua.completed && (
                  <Button
                    variant="success"
                    onClick={() =>
                      downloadCSV(
                        `${API_BASE}/export-user-assessment-csv/${ua.id}/`,
                        `assessment_${ua.id}.csv`
                      )
                    }
                  >
                    Exportar CSV
                  </Button>
                )}
                <IconButton variant="danger" size="md" onClick={() => handleDeleteAssessment(ua.id)} ariaLabel="Borrar">
                  <Trash2 className="w-5 h-5" />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyAssessments;
