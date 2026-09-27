import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/dashboard/scheduled', { replace: true });
  }, [navigate]);

  return null;
};
