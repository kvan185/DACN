import { Navigate, useLocation } from 'react-router-dom';

export const RequireAuth = ({ children }) => {
    const location = useLocation();
    const accessToken = sessionStorage.getItem("accessToken");


    const isTableOrder = location.state?.orderSource === 'table' || sessionStorage.getItem('orderSource') === 'table';
    const isFullTablePayment = location.state?.isFullTablePayment;

    if (!accessToken && !isTableOrder && !isFullTablePayment) {
        // Lưu lại đường dẫn hiện tại để quay lại sau khi đăng nhập
        return <Navigate to={`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`} />;
    }

    return children;
};

export const RequireStaff = ({ children }) => {
    const location = useLocation();
    const user = JSON.parse(sessionStorage.getItem("user"));
    const accessToken = sessionStorage.getItem("accessToken");


    if (!accessToken || !user || user.role !== 'staff') {
        return <Navigate to={`/login?returnUrl=${encodeURIComponent(location.pathname)}`} />;
    }

    return children;
}; 