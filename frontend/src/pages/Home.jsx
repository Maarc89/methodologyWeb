import React, { useEffect, useState } from 'react';

const Home = () => {
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/assessments/')
      .then(response => response.json())
      .then(data => setAssessments(data))
      .catch(error => console.error('Error:', error));
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Assessments</h1>
      <ul className="space-y-2">
        {assessments.map(assessment => (
          <li key={assessment.id} className="p-4 border rounded shadow-sm hover:bg-gray-100">
            <a href={`/assessment/${assessment.id}`} className="text-blue-600">
              {assessment.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Home;
