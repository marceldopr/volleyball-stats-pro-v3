import { Navigate } from "react-router-dom";
import { useRoleScope } from "@/hooks/useRoleScope";

type RoleGuardProps = {
    allowedForDT?: boolean;
    allowedForCoach?: boolean;
    children: React.ReactNode;
};

export function RoleGuard({ allowedForDT, allowedForCoach, children }: RoleGuardProps) {
    const { isDT, isCoach, loading } = useRoleScope();

    // Wait for role to be determined before checking permissions
    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const isAllowed =
        (allowedForDT && isDT) ||
        (allowedForCoach && isCoach);

    if (!isAllowed) {
        // Redirect to home if not authorized
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
