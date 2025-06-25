import React, {useEffect, useState} from 'react';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const COLORS = ['#4caf50', '#ff9800', '#f44336', '#9e9e9e', '#2196f3', '#9c27b0'];
const PIE_COLORS = ['#4caf50', '#f44336'];

const AssessmentAnalysis = ({userAssessmentId}) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const API_BASE = 'http://localhost:8001/api';

    useEffect(() => {
        const token = localStorage.getItem('token');  // Ajusta si guardas el token en otro sitio

        fetch(`${API_BASE}/user-assessments/${userAssessmentId}/analysis/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,  // O usa `Bearer` si tu backend lo espera así
            },
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error('No autorizado o error al cargar datos');
                }
                return res.json();
            })
            .then(json => {
                setData(json);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [userAssessmentId]);


    if (loading) return <p>Cargando análisis...</p>;
    if (!data) return <p>Error cargando datos.</p>;

    // Pie chart data
    const pieData = [
        {name: 'Cumplimiento total (Sí)', value: data.pie.percent_fully_compliant},
        {name: 'Otros', value: 100 - data.pie.percent_fully_compliant},
    ];

    // Bar chart keys dinámicos
    const allKeys = new Set();
    data.bar.forEach(entry => {
        Object.keys(entry).forEach(key => {
            if (key !== 'area') allKeys.add(key);
        });
    });
    const keys = Array.from(allKeys);

    // Spider chart data
    const spiderData = data.spider;

    console.log("data.pie:", data.pie);
    console.log("data.bar:", data.bar);
    console.log("data.spider:", data.spider);

    return (
        <div>

            <h3>Porcentaje de controles con cumplimiento total</h3>
            <PieChart width={300} height={300}>
                <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label
                >
                    {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]}/>
                    ))}
                </Pie>
            </PieChart>

            <h3>Controles evaluados por área y estado</h3>
            <BarChart
                width={600}
                height={300}
                data={data.bar}
                margin={{top: 20, right: 30, left: 20, bottom: 5}}
            >
                <XAxis dataKey="area"/>
                <YAxis/>
                <Tooltip/>
                <Legend/>
                {keys.map((key, index) => (
                    <Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]}/>
                ))}
            </BarChart>

            <h3>Porcentaje de controles totalmente cumplidos por área</h3>
            <RadarChart cx={300} cy={250} outerRadius={150} width={600} height={500} data={spiderData}>
                <PolarGrid/>
                <PolarAngleAxis dataKey="area"/>
                <PolarRadiusAxis angle={30} domain={[0, 100]}/>
                <Radar name="Cumplimiento (%)" dataKey="porcentaje" stroke="#4caf50" fill="#4caf50" fillOpacity={0.6}/>
            </RadarChart>
        </div>
    );
};

export default AssessmentAnalysis;
