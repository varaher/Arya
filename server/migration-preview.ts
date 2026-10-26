// Explicitly opt in on the migration deployment; existing Replit defaults stay unchanged.
export const migrationPreview = process.env.ARYA_MIGRATION_PREVIEW === "true";
