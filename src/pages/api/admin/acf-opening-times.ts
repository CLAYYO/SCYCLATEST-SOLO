import type { APIRoute } from 'astro';
import { supabaseServer } from '../../../lib/supabase-server';

// Helper function to upload files to Supabase Storage
async function uploadFile(file: File, bucket: string, folder: string): Promise<{ url: string; filename: string } | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabaseServer.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabaseServer.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      filename: fileName
    };
  } catch (error) {
    console.error('File upload error:', error);
    return null;
  }
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
      // Get single opening time
      const { data: openingTime, error } = await supabaseServer
        .from('acf_opening_times')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ openingTime }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Get all opening times
      const { data: openingTimes, error } = await supabaseServer
        .from('acf_opening_times')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ openingTimes }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('GET error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    
    // Extract text fields
    const openingTimeData: any = {
      title: formData.get('title') as string,
      category: formData.get('category') as string || null,
      description: formData.get('description') as string || null,
      schedule: formData.get('schedule') as string || null,
    };

    // Handle image upload
    const imageFile = formData.get('image') as File;
    if (imageFile && imageFile.size > 0) {
      const uploadResult = await uploadFile(imageFile, 'acf-content', 'opening-times/images');
      if (uploadResult) {
        openingTimeData.image_url = uploadResult.url;
        openingTimeData.image_filename = uploadResult.filename;
      }
    }

    // Insert into database
    const { data, error } = await supabaseServer
      .from('acf_opening_times')
      .insert([openingTimeData])
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      message: 'Opening time created successfully', 
      openingTime: data 
    }), {
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

export const PUT: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const id = formData.get('id') as string;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Opening time ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract text fields
    const openingTimeData: any = {
      title: formData.get('title') as string,
      category: formData.get('category') as string || null,
      description: formData.get('description') as string || null,
      schedule: formData.get('schedule') as string || null,
      updated_at: new Date().toISOString()
    };

    // Handle image upload
    const imageFile = formData.get('image') as File;
    if (imageFile && imageFile.size > 0) {
      const uploadResult = await uploadFile(imageFile, 'acf-content', 'opening-times/images');
      if (uploadResult) {
        openingTimeData.image_url = uploadResult.url;
        openingTimeData.image_filename = uploadResult.filename;
      }
    }

    // Update in database
    const { data, error } = await supabaseServer
      .from('acf_opening_times')
      .update(openingTimeData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      message: 'Opening time updated successfully', 
      openingTime: data 
    }), {
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

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();

    if (!id) {
      return new Response(JSON.stringify({ error: 'Opening time ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // TODO: Delete associated files from storage
    // Get opening time data first to find files to delete
    // const { data: openingTime } = await supabaseServer
    //   .from('acf_opening_times')
    //   .select('image_filename')
    //   .eq('id', id)
    //   .single();

    // Delete from database
    const { error } = await supabaseServer
      .from('acf_opening_times')
      .delete()
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      message: 'Opening time deleted successfully' 
    }), {
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