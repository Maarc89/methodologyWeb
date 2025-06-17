import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, Legend, Tooltip,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const ExampleCharts = ({pieData, barData, radarData}) => {
    return (
        <div>
            {/* Diagrama de arco */}
            <h3>Cumplimiento Total (Sí) vs Total Evaluado</h3>
            <PieChart width={400} height={300}>
                <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                >
                    {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>
                    ))}
                </Pie>
            </PieChart>

            {/* Gráfico de barras agrupadas por área */}
            <h3>Cantidad de controles evaluados por respuesta y área</h3>
            <BarChart
                width={600}
                height={300}
                data={barData}
                margin={{top: 20, right: 30, left: 20, bottom: 5}}
            >
                <XAxis dataKey="area"/>
                <YAxis/>
                <Tooltip/>
                <Legend/>
                <Bar dataKey="Sí" stackId="a" fill="#0088FE"/>
                <Bar dataKey="Parcialmente" stackId="a" fill="#00C49F"/>
                <Bar dataKey="No" stackId="a" fill="#FF8042"/>
                <Bar dataKey="N/A" stackId="a" fill="#FFBB28"/>
            </BarChart>

            {/* Gráfico de araña */}
            <h3>Porcentaje de controles totalmente cumplidos por área</h3>
            <RadarChart cx={300} cy={250} outerRadius={150} width={600} height={500} data={radarData}>
                <PolarGrid/>
                <PolarAngleAxis dataKey="area"/>
                <PolarRadiusAxis angle={30} domain={[0, 100]}/>
                <Radar name="Cumplimiento" dataKey="cumplimiento" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6}/>
                <Legend/>
            </RadarChart>
        </div>
    );
};

export default ExampleCharts;
