import type { APIRoute } from 'astro';
import { parseSailwaveHTML, validateRaceData, sanitizeHTML } from '../../../utils/sailwaveParser';

// API route will be handled at build time for static deployment

export const POST: APIRoute = async ({ request }) => {
  try {
    // Check content type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({ error: 'Content-Type must be multipart/form-data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    if (!file.name.match(/\.(htm|html)$/i)) {
      return new Response(
        JSON.stringify({ error: 'File must be an HTML file (.htm or .html)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'File size must be less than 5MB' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Read file content
    const htmlContent = await file.text();
    
    // Sanitize HTML content
    const sanitizedHTML = sanitizeHTML(htmlContent);

    // Parse the HTML
    const parsedData = parseSailwaveHTML(sanitizedHTML);

    // Validate parsed data
    const validationErrors = validateRaceData(parsedData);
    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid race data', 
          details: validationErrors 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return parsed data for preview
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: parsedData,
        message: 'File parsed successfully. Review the data below and confirm to import.' 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Upload processing error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process file', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Handle preflight requests for CORS
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};