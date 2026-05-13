import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import keycloak from './Keycloak';

import Layout from './components/Layout';
import Home from './pages/Home';
import MyAssessments from './pages/MyAssessments';
import UserAssessmentDetail from './pages/UserAssessmentDetail';
import CreateAssessment from './pages/CreateAssessment';
import EditAssessment from './pages/EditAssessment';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import PrivateRoute from './routes/PrivateRoute';
import AccessRequestsAdmin from './pages/AccessRequestsAdmin';
import CreateUser from './pages/CreateUser';
import AdminAssessments from './pages/AdminAssessments';
import ManageUsers from './pages/ManageUsers';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    keycloak.init({ onLoad: 'login-required' }).then(async (authenticated) => {
      setIsAuthenticated(authenticated);

      if (authenticated) {
        try {
          const info = await keycloak.loadUserInfo();
          setUserInfo(info);
        } catch (err) {
          console.error('Error cargando info del usuario:', err);
        }
      }

      setLoading(false);
    });
  }, []);

  const handleLogout = () => {
    keycloak.logout({ redirectUri: window.location.origin });
    setIsAuthenticated(false);
    setUserInfo(null);
  };

  if (loading) return <div>Cargando autenticación...</div>;

  return (
    <Routes>
      <Route
        path="/"
        element={<Layout isAuthenticated={isAuthenticated} userInfo={userInfo} onLogout={handleLogout} />}
      >
        <Route index element={<Home />} />
        <Route path="/create-assessment" element={<CreateAssessment />} />
        <Route path="/assessments/:id/edit" element={<EditAssessment />} />
        <Route
          path="/admin/access-requests"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <AccessRequestsAdmin />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/create-user"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <CreateUser />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/manage-users"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <ManageUsers />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/assessments"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <AdminAssessments />
            </PrivateRoute>
          }
        />
        <Route
          path="profile"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <Profile userInfo={userInfo} />
            </PrivateRoute>
          }
        />
        <Route
          path="my-assessments"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <MyAssessments />
            </PrivateRoute>
          }
        />
        <Route
          path="user-assessments/:id"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <UserAssessmentDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <Settings userInfo={userInfo} />
            </PrivateRoute>
          }
        />
      </Route>
    </Routes>
  );
};

export default App;
