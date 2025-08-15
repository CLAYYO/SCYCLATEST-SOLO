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
      // Get single accommodation
      const { data: accommodation, error } = await supabase
        .from('acf_local_accommodations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ accommodation }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Get all accommodations
      const { data: accommodations, error } = await supabase
        .from('acf_local_accommodations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ accommodations }), {
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
    const accommodationData: any = {
      business_name: formData.get('business_name') as string,
      address: formData.get('address') as string || null,
      phone: formData.get('phone') as string || null,
      website: formData.get('website') as string || null,
      blurb: formData.get('blurb') as string || null,
      category: formData.get('category') as string || null,
    };

    // Handle image upload
    const imageFile = formData.get('image') as File;
    if (imageFile && imageFile.size > 0) {
      const uploadResult = await uploadFile(imageFile, 'acf-content', 'accommodations/images');
      if (uploadResult) {
        accommodationData.image_url = uploadResult.url;
        accommodationData.image_filename = uploadResult.filename;
      }
    }

    // Insert into database
    const { data, error } = await supabase
      .from('acf_local_accommodations')
      .insert([accommodationData])
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      message: 'Business created successfully', 
      accommodation: data 
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
      return new Response(JSON.stringify({ error: 'Accommodation ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract text fields
    const accommodationData: any = {
      business_name: formData.get('business_name') as string,
      address: formData.get('address') as string || null,
      phone: formData.get('phone') as string || null,
      website: formData.get('website') as string || null,
      blurb: formData.get('blurb') as string || null,
      category: formData.get('category') as string || null,
      updated_at: new Date().toISOString()
    };

    // Handle image upload
    const imageFile = formData.get('image') as File;
    if (imageFile && imageFile.size > 0) {
      const uploadResult = await uploadFile(imageFile, 'acf-content', 'accommodations/images');
      if (uploadResult) {
        accommodationData.image_url = uploadResult.url;
        accommodationData.image_filename = uploadResult.filename;
      }
    }

    // Update in database
    const { data, error } = await supabase
      .from('acf_local_accommodations')
      .update(accommodationData)
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
      message: 'Business updated successfully', 
      accommodation: data 
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
      return new Response(JSON.stringify({ error: 'Accommodation ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // TODO: Delete associated files from storage
    // Get accommodation data first to find files to delete
    // const { data: accommodation } = await supabase
    //   .from('acf_local_accommodations')
    //   .select('image_filename')
    //   .eq('id', id)
    //   .single();

    // Delete from database
    const { error } = await supabase
      .from('acf_local_accommodations')
      .delete()
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      message: 'Business deleted successfully' 
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