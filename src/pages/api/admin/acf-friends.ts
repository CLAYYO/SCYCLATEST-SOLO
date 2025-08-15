import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

// Helper function to upload files to Supabase Storage
async function uploadFile(file: File, bucket: string, folder: string): Promise<{ url: string; filename: string } | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
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
      // Get single friend
      const { data: friend, error } = await supabase
        .from('acf_friends')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ friend }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Get all friends
      const { data: friends, error } = await supabase
        .from('acf_friends')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ friends }), {
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
    const friendData: any = {
      organization_name: formData.get('organization_name') as string,
      description: formData.get('description') as string || null,
      website_url: formData.get('website_url') as string || null,
    };

    // Handle logo upload
    const logoFile = formData.get('logo') as File;
    if (logoFile && logoFile.size > 0) {
      const uploadResult = await uploadFile(logoFile, 'acf-content', 'friends/logos');
      if (uploadResult) {
        friendData.logo_url = uploadResult.url;
        friendData.logo_filename = uploadResult.filename;
      }
    }

    // Insert into database
    const { data, error } = await supabase
      .from('acf_friends')
      .insert([friendData])
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      message: 'Friend created successfully', 
      friend: data 
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
      return new Response(JSON.stringify({ error: 'Friend ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract text fields
    const friendData: any = {
      organization_name: formData.get('organization_name') as string,
      description: formData.get('description') as string || null,
      website_url: formData.get('website_url') as string || null,
      updated_at: new Date().toISOString()
    };

    // Handle logo upload
    const logoFile = formData.get('logo') as File;
    if (logoFile && logoFile.size > 0) {
      const uploadResult = await uploadFile(logoFile, 'acf-content', 'friends/logos');
      if (uploadResult) {
        friendData.logo_url = uploadResult.url;
        friendData.logo_filename = uploadResult.filename;
      }
    }

    // Update in database
    const { data, error } = await supabase
      .from('acf_friends')
      .update(friendData)
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
      message: 'Friend updated successfully', 
      friend: data 
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
      return new Response(JSON.stringify({ error: 'Friend ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // TODO: Delete associated files from storage
    // Get friend data first to find files to delete
    // const { data: friend } = await supabase
    //   .from('acf_friends')
    //   .select('logo_filename')
    //   .eq('id', id)
    //   .single();

    // Delete from database
    const { error } = await supabase
      .from('acf_friends')
      .delete()
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      message: 'Friend deleted successfully' 
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