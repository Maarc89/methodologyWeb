import keycloak from '../Keycloak.js';
import Profile from './Profile.jsx';

const Settings = ({ userInfo }) => {
  return <Profile userInfo={userInfo} />;
};

export default Settings;
