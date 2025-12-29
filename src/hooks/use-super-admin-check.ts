import { useState, useEffect } from 'react';

// In production, use relative URLs (same origin). In development, use localhost:3001
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3001');

export function useSuperAdminCheck() {
  const [checking, setChecking] = useState(true);
  const [superAdminExists, setSuperAdminExists] = useState(false);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const response = await fetch(`${API_URL}/api/admin/setup/check`);
        const data = await response.json();
        setSuperAdminExists(data.superAdminExists);
      } catch (error) {
        console.error('Error checking super admin:', error);
        // If API is not available, assume super admin exists to prevent blocking
        setSuperAdminExists(true);
      } finally {
        setChecking(false);
      }
    };

    checkSuperAdmin();
  }, []);

  return { checking, superAdminExists };
}

