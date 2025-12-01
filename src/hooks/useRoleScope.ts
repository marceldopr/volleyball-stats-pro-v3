import { useCurrentUserRole } from "@/hooks/useCurrentUserRole";
import { useAuthStore } from "@/stores/authStore";

export function useRoleScope() {
    const { isDT, isCoach, assignedTeamIds, loading } = useCurrentUserRole();
    const { profile } = useAuthStore();

    return {
        isDT,
        isCoach,
        assignedTeamIds: assignedTeamIds ?? [],
        userId: profile?.id ?? null,
        role: profile?.role ?? null,
        loading
    };
}
