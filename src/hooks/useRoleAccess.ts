import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../data/mockData';

export const useRoleAccess = (allowedRoles: UserRole[], redirectPath = '/dashboard') => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser && !allowedRoles.includes(currentUser.role)) {
            navigate(redirectPath, { replace: true });
        }
    }, [currentUser, allowedRoles, navigate, redirectPath]);

    const hasAccess = currentUser ? allowedRoles.includes(currentUser.role) : false;

    return { hasAccess, currentUser };
};
