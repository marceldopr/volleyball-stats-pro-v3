/**
 * Console Filter Helper
 * 
 * INSTRUCTIONS:
 * 1. Open browser console (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 
 * This will hide Supabase 406/400 errors from the console while still logging them in the background.
 * The errors don't affect functionality - they just mean some data doesn't exist yet.
 */

(function () {
    // Save original console.error
    const originalError = console.error;

    // Override console.error to filter Supabase errors
    console.error = function (...args) {
        const errorMessage = args.join(' ');

        // Filter out Supabase 406 and 400 errors
        if (
            errorMessage.includes('406') ||
            errorMessage.includes('400') ||
            errorMessage.includes('Bad Request') ||
            errorMessage.includes('Not Acceptable') ||
            errorMessage.includes('supabase.co/rest/v1/')
        ) {
            // Log to a hidden group (won't show in console by default)
            console.groupCollapsed('%c[Filtered] Supabase Query Error', 'color: gray; font-style: italic;');
            originalError.apply(console, args);
            console.groupEnd();
            return;
        }

        // Pass through all other errors
        originalError.apply(console, args);
    };

    console.log('%c✅ Console filter activated', 'color: green; font-weight: bold;');
    console.log('%cSupabase 406/400 errors are now hidden (expand "[Filtered]" groups to see them)');
})();
