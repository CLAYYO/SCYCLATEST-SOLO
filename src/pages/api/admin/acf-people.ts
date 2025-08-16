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
      // Get single person using server client with service role key
      const { data: person, error } = await supabaseServer
        .from('acf_people')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ person }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Get all people using server client with service role key
      const { data: people, error } = await supabaseServer
        .from('acf_people')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ people }), {
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
    const personData: any = {
      title: formData.get('persons_name') as string, // Use person's name as title
      persons_name: formData.get('persons_name') as string,
      position: formData.get('position') as string || null,
      where_do_they_work: formData.get('where_do_they_work') as string || null,
    };

    // Handle image upload
    const imageFile = formData.get('persons_image') as File;
    if (imageFile && imageFile.size > 0) {
      const uploadResult = await uploadFile(imageFile, 'acf-content', 'people/images');
      if (uploadResult) {
        personData.persons_image_url = uploadResult.url;
        personData.persons_image_filename = uploadResult.filename;
      }
    }

    // Insert into database using server client with service role key
    const { data, error } = await supabaseServer
      .from('acf_people')
      .insert([personData])
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      message: 'Person created successfully', 
      person: data 
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
      return new Response(JSON.stringify({ error: 'Person ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract text fields
    const personData: any = {
      title: formData.get('persons_name') as string, // Use person's name as title
      persons_name: formData.get('persons_name') as string,
      position: formData.get('position') as string || null,
      where_do_they_work: formData.get('where_do_they_work') as string || null,
      updated_at: new Date().toISOString()
    };

    // Handle image upload
    const imageFile = formData.get('persons_image') as File;
    if (imageFile && imageFile.size > 0) {
      const uploadResult = await uploadFile(imageFile, 'acf-content', 'people/images');
      if (uploadResult) {
        personData.persons_image_url = uploadResult.url;
        personData.persons_image_filename = uploadResult.filename;
      }
    }

    // Update in database using server client with service role key
    const { data, error } = await supabaseServer
      .from('acf_people')
      .update(personData)
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
      message: 'Person updated successfully', 
      person: data 
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
      return new Response(JSON.stringify({ error: 'Person ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // TODO: Delete associated files from storage
    // Get person data first to find files to delete
    // const { data: person } = await supabase
    //   .from('acf_people')
    //   .select('persons_image_filename')
    //   .eq('id', id)
    //   .single();

    // Delete from database using server client with service role key
    const { error } = await supabaseServer
      .from('acf_people')
      .delete()
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      message: 'Person deleted successfully' 
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