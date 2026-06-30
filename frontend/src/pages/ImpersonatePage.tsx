import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function ImpersonatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('accessToken', token);
      localStorage.removeItem('refreshToken');
      navigate('/', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [params, navigate]);

  return <div className="login-loading">Iniciando sesion...</div>;
}
