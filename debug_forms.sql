-- Debug query to check forms and submissions linking
SELECT 
    f.id as form_id,
    f.title as form_title,
    f.slug as form_slug,
    COUNT(fs.id) as submission_count
FROM forms f 
LEFT JOIN form_submissions fs ON f.id = fs.form_id 
GROUP BY f.id, f.title, f.slug
ORDER BY f.created_at;

-- Also check if there are submissions without form_id
SELECT 
    COUNT(*) as orphaned_submissions
FROM form_submissions 
WHERE form_id IS NULL;

-- Check sample submissions to see their form_id values
SELECT 
    id,
    form_id,
    created_at,
    data->>'name' as name,
    data->>'email' as email
FROM form_submissions 
ORDER BY created_at DESC 
LIMIT 5;