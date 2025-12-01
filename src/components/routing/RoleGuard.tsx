import { Navigate } from "react-router-dom";
import { useRoleScope } from "@/hooks/useRoleScope";

type RoleGuardProps = {
    allowedForDT?: boolean;
    allowedForCoach?: boolean;
    children: React.ReactNode;
};

export function RoleGuard({ allowedForDT, allowedForCoach, children }: RoleGuardProps) {
    const { isDT, isCoach } = useRoleScope();

    const isAllowed =
        (allowedForDT && isDT) ||
        (allowedForCoach && isCoach);

    if (!isAllowed) {
        // You might want to redirect to a specific "unauthorized" page or just home
        // For now, redirecting to root which handles redirects based on role usually
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
