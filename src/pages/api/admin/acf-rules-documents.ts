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
      // Get single document
      const { data: document, error } = await supabase
        .from('acf_rules_documents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ document }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Get all documents
      const { data: documents, error } = await supabase
        .from('acf_rules_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ documents }), {
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
    const documentData: any = {
      title: formData.get('title') as string,
      category: formData.get('category') as string || null,
      description: formData.get('description') as string || null,
      content: formData.get('content') as string || null,
    };

    // Handle document file upload
    const documentFile = formData.get('document') as File;
    if (documentFile && documentFile.size > 0) {
      const uploadResult = await uploadFile(documentFile, 'acf-content', 'rules-documents');
      if (uploadResult) {
        documentData.document_url = uploadResult.url;
        documentData.document_filename = uploadResult.filename;
      }
    }

    // Insert into database
    const { data, error } = await supabase
      .from('acf_rules_documents')
      .insert([documentData])
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      message: 'Document created successfully', 
      document: data 
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
      return new Response(JSON.stringify({ error: 'Document ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract text fields
    const documentData: any = {
      title: formData.get('title') as string,
      category: formData.get('category') as string || null,
      description: formData.get('description') as string || null,
      content: formData.get('content') as string || null,
      updated_at: new Date().toISOString()
    };

    // Handle document file upload
    const documentFile = formData.get('document') as File;
    if (documentFile && documentFile.size > 0) {
      const uploadResult = await uploadFile(documentFile, 'acf-content', 'rules-documents');
      if (uploadResult) {
        documentData.document_url = uploadResult.url;
        documentData.document_filename = uploadResult.filename;
      }
    }

    // Update in database
    const { data, error } = await supabase
      .from('acf_rules_documents')
      .update(documentData)
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
      message: 'Document updated successfully', 
      document: data 
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
      return new Response(JSON.stringify({ error: 'Document ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // TODO: Delete associated files from storage
    // Get document data first to find files to delete
    // const { data: document } = await supabase
    //   .from('acf_rules_documents')
    //   .select('document_filename')
    //   .eq('id', id)
    //   .single();

    // Delete from database
    const { error } = await supabase
      .from('acf_rules_documents')
      .delete()
      .eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      message: 'Document deleted successfully' 
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