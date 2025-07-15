import React, {useEffect, useState} from 'react';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {API_BASE} from "../config.js";

const COLORS = ['#4caf50', '#ff9800', '#f44336', '#9e9e9e', '#2196f3', '#9c27b0'];
const PIE_COLORS = ['#4caf50', '#f44336'];

// Etiquetas personalizadas para PieChart
const renderCustomizedLabel = ({
                                   cx, cy, midAngle, outerRadius, percent
                               }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20; // Más afuera
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text
            x={x}
            y={y}
            fill="#333"
            textAnchor={x > cx ? 'start' : 'end'}
            dominantBaseline="central"
            fontWeight="bold"
            fontSize={14}
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

// Tooltip personalizado para BarChart
const CustomTooltip = ({active, payload, label}) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                padding: '8px 12px',
                borderRadius: 6,
                color: '#fff',
                fontSize: 14,
            }}>
                <p><strong>{label}</strong></p>
                {payload.map((entry, index) => (
                    <p key={`item-${index}`} style={{color: entry.fill}}>
                        {`${entry.name}: ${entry.value}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// Tick personalizado para XAxis del BarChart con rotación
const CustomizedAxisTick = ({x, y, payload}) => (
    <text
        x={x}
        y={y}
        dy={10}
        textAnchor="end"
        fill="#333"
        fontWeight="bold"
        fontSize={12}
        transform={`rotate(-20, ${x}, ${y})`}
    >
        {payload.value}
    </text>
);

const AssessmentAnalysis = ({userAssessmentId}) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE}/user-assessments/${userAssessmentId}/analysis/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
            },
        })
            .then(res => {
                if (!res.ok) throw new Error('No autorizado o error al cargar datos');
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

    const pieData = [
        {name: 'Cumplimiento total (Sí)', value: data.pie.percent_fully_compliant},
        {name: 'Otros', value: 100 - data.pie.percent_fully_compliant},
    ];

    const allKeys = new Set();
    data.bar.forEach(entry => {
        Object.keys(entry).forEach(key => {
            if (key !== 'area') allKeys.add(key);
        });
    });
    const keys = Array.from(allKeys);

    const spiderData = data.spider;

    return (
        <div style={{maxWidth: 700, margin: '0 auto', fontFamily: 'Arial, sans-serif'}}>
            <h3 style={{textAlign: 'center'}}>Porcentaje de controles con cumplimiento total</h3>
            <PieChart width={300} height={300} style={{display: 'block', margin: '0 auto'}}>
                <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                    label={renderCustomizedLabel}
                    labelLine={false}
                    isAnimationActive={true}
                    animationDuration={1000}
                >
                    {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]}/>
                    ))}
                </Pie>
            </PieChart>

            <h3 style={{textAlign: 'center', marginTop: 40}}>Controles evaluados por área y estado</h3>
            <BarChart
                width={600}
                height={300}
                data={data.bar}
                margin={{top: 20, right: 30, left: 20, bottom: 80}} // más espacio abajo
                style={{margin: '0 auto', display: 'block'}}
            >
                <XAxis dataKey="area" tick={<CustomizedAxisTick/>} interval={0}/>
                <YAxis/>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend
                    verticalAlign="top"
                    wrapperStyle={{fontSize: 14, fontWeight: 'bold'}}
                />
                {keys.map((key, index) => (
                    <Bar
                        key={key}
                        dataKey={key}
                        stackId="a"
                        fill={COLORS[index % COLORS.length]}
                        isAnimationActive={true}
                        animationDuration={1500}
                    />
                ))}
            </BarChart>

            <h3 style={{textAlign: 'center', marginTop: 40}}>Porcentaje de controles totalmente cumplidos por área</h3>
            <RadarChart
                cx={300}
                cy={250}
                outerRadius={150}
                width={600}
                height={500}
                data={spiderData}
                style={{margin: '0 auto', display: 'block'}}
            >
                <PolarGrid/>
                <PolarAngleAxis dataKey="area" tick={{fontWeight: 'bold', fill: '#333'}}/>
                <PolarRadiusAxis angle={30} domain={[0, 100]}/>
                <Radar
                    name="Cumplimiento (%)"
                    dataKey="porcentaje"
                    stroke="#4caf50"
                    fill="#4caf50"
                    fillOpacity={0.6}
                    strokeWidth={3}
                    isAnimationActive={true}
                    animationDuration={1200}
                />
                <Legend
                    verticalAlign="top"
                    wrapperStyle={{fontSize: 14, fontWeight: 'bold'}}
                />
            </RadarChart>
        </div>
    );
};

export default AssessmentAnalysis;
