import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  try {
    console.log('Creating migration file...');
    
    const migrationContent = `-- Add submission_count column to forms table
ALTER TABLE forms ADD COLUMN IF NOT EXISTS submission_count INTEGER DEFAULT 0;

-- Update submission counts for existing forms
DO $$
DECLARE
  form_record RECORD;
  submission_count INTEGER;
BEGIN
  FOR form_record IN SELECT id FROM forms LOOP
    SELECT COUNT(*) INTO submission_count FROM form_submissions WHERE form_id = form_record.id;
    UPDATE forms SET submission_count = submission_count WHERE id = form_record.id;
  END LOOP;
END;
$$;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
`;
    
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250815_add_submission_count.sql');
    await writeFile(migrationPath, migrationContent);
    
    console.log(`Migration file created at ${migrationPath}`);
    console.log('Applying migration...');
    
    try {
      const { stdout, stderr } = await execPromise('npx supabase db push');
      console.log('Migration applied successfully!');
      console.log(stdout);
      
      if (stderr) {
        console.error('Warnings during migration:', stderr);
      }
    } catch (pushError) {
      console.error('Error applying migration:', pushError.message);
      console.log('\nPlease apply the migration manually using the Supabase dashboard.');
      console.log('The migration file has been created at:', migrationPath);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

applyMigration();