import type { APIRoute } from 'astro';
import { supabaseServer } from '../../../lib/supabase-server';

// Helper function to upload file to Supabase Storage
async function uploadFile(file: File, bucket: string, folder: string): Promise<{ url: string; filename: string } | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabaseServer.storage
      .from(bucket)
      .upload(filePath, file);

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabaseServer.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      filename: file.name
    };
  } catch (error) {
    console.error('File upload error:', error);
    return null;
  }
}

// GET - Fetch all events or single event
export const GET: APIRoute = async ({ url }) => {
  try {
    const eventId = url.searchParams.get('id');
    
    if (eventId) {
      // Get single event
      const { data: event, error } = await supabaseServer
        .from('acf_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ event }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Get all events
      const { data: events, error } = await supabaseServer
        .from('acf_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ events }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Create new event
export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    
    // Extract text fields
    const eventData: any = {
      title: formData.get('title') as string,
      content: formData.get('content') as string || null,
      event_start_date: formData.get('event_start_date') as string || null,
      event_end_date: formData.get('event_end_date') as string || null,
      event_category: formData.get('event_category') as string || null,
      venue: formData.get('venue') as string || null,
      organiser: formData.get('organiser') as string || null,
      entry_form_details: formData.get('entry_form_details') as string || null,
      event_noticeboard: formData.get('event_noticeboard') as string || null,
      supaboxes_date: formData.get('supaboxes_date') as string || null
    };

    // Handle file uploads
    const fileFields = [
      { field: 'notice_of_race', urlField: 'notice_of_race_url', filenameField: 'notice_of_race_filename' },
      { field: 'sailing_instructions', urlField: 'sailing_instructions_url', filenameField: 'sailing_instructions_filename' },
      { field: 'dinghy_launching_guide', urlField: 'dinghy_launching_guide_url', filenameField: 'dinghy_launching_guide_filename' },
      { field: 'event_beach_info', urlField: 'event_beach_info_url', filenameField: 'event_beach_info_filename' }
    ];

    for (const { field, urlField, filenameField } of fileFields) {
      const file = formData.get(field) as File;
      if (file && file.size > 0) {
        const uploadResult = await uploadFile(file, 'acf-documents', 'events');
        if (uploadResult) {
          eventData[urlField] = uploadResult.url;
          eventData[filenameField] = uploadResult.filename;
        }
      }
    }

    // Insert into database
    const { data: event, error } = await supabaseServer
      .from('acf_events')
      .insert([eventData])
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ event, message: 'Event created successfully' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('POST error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update existing event
export const PUT: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const eventId = formData.get('id') as string;

    if (!eventId) {
      return new Response(JSON.stringify({ error: 'Event ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract text fields
    const eventData: any = {
      title: formData.get('title') as string,
      content: formData.get('content') as string || null,
      event_start_date: formData.get('event_start_date') as string || null,
      event_end_date: formData.get('event_end_date') as string || null,
      event_category: formData.get('event_category') as string || null,
      venue: formData.get('venue') as string || null,
      organiser: formData.get('organiser') as string || null,
      entry_form_details: formData.get('entry_form_details') as string || null,
      event_noticeboard: formData.get('event_noticeboard') as string || null,
      supaboxes_date: formData.get('supaboxes_date') as string || null
    };

    // Handle file uploads (only if new files are provided)
    const fileFields = [
      { field: 'notice_of_race', urlField: 'notice_of_race_url', filenameField: 'notice_of_race_filename' },
      { field: 'sailing_instructions', urlField: 'sailing_instructions_url', filenameField: 'sailing_instructions_filename' },
      { field: 'dinghy_launching_guide', urlField: 'dinghy_launching_guide_url', filenameField: 'dinghy_launching_guide_filename' },
      { field: 'event_beach_info', urlField: 'event_beach_info_url', filenameField: 'event_beach_info_filename' }
    ];

    for (const { field, urlField, filenameField } of fileFields) {
      const file = formData.get(field) as File;
      if (file && file.size > 0) {
        const uploadResult = await uploadFile(file, 'acf-documents', 'events');
        if (uploadResult) {
          eventData[urlField] = uploadResult.url;
          eventData[filenameField] = uploadResult.filename;
        }
      }
    }

    // Update in database
    const { data: event, error } = await supabaseServer
      .from('acf_events')
      .update(eventData)
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ event, message: 'Event updated successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('PUT error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Delete event
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();

    if (!id) {
      return new Response(JSON.stringify({ error: 'Event ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get event data first to clean up files
    const { data: event } = await supabaseServer
      .from('acf_events')
      .select('*')
      .eq('id', id)
      .single();

    // Delete the event
    const { error } = await supabaseServer
      .from('acf_events')
      .delete()
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // TODO: Clean up associated files from storage
    // This would require extracting file paths from URLs and deleting them

    return new Response(JSON.stringify({ message: 'Event deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};