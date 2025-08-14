import type { APIRoute } from 'astro';
import { supabaseServer } from '../../../lib/supabase-server';
import type { ParsedRaceData } from '../../../utils/sailwaveParser';

// API route will be handled at build time for static deployment

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const raceData: ParsedRaceData = await request.json();

    if (!raceData || !raceData.title || !raceData.competitors) {
      return new Response(
        JSON.stringify({ error: 'Invalid race data provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Start a transaction-like process
    const results = {
      raceId: null as string | null,
      boatsCreated: 0,
      membersCreated: 0,
      resultsCreated: 0,
      errors: [] as string[]
    };

    try {
      // 1. Create or update the race record
      const { data: raceRecord, error: raceError } = await supabaseServer
        .from('races')
        .insert({
          name: raceData.title,
          race_date: new Date().toISOString().split('T')[0], // Use current date as placeholder
          venue: raceData.venue || 'Unknown',
          boat_class: 'Mixed', // Default class
          division: raceData.divisions?.[0] || 'General',
          results_published: false,
          results_provisional: raceData.provisionalTimestamp ? true : false
        })
        .select()
        .single();

      if (raceError) {
        throw new Error(`Failed to create race: ${raceError.message}`);
      }

      results.raceId = raceRecord.id;

      // 2. Process each competitor
      for (const competitor of raceData.competitors) {
        try {
          // Check if boat exists, create if not
          let { data: boat, error: boatSelectError } = await supabaseServer
            .from('boats')
            .select('id')
            .eq('sail_number', competitor.sailNumber)
            .single();

          if (boatSelectError && boatSelectError.code === 'PGRST116') {
            // Boat doesn't exist, create it
            const { data: newBoat, error: boatInsertError } = await supabaseServer
              .from('boats')
              .insert({
                sail_number: competitor.sailNumber,
                boat_class: competitor.division,
                name: `Boat ${competitor.sailNumber}`
              })
              .select()
              .single();

            if (boatInsertError) {
              results.errors.push(`Failed to create boat ${competitor.sailNumber}: ${boatInsertError.message}`);
              continue;
            }

            boat = newBoat;
            results.boatsCreated++;
          } else if (boatSelectError) {
            results.errors.push(`Error checking boat ${competitor.sailNumber}: ${boatSelectError.message}`);
            continue;
          }

          // Check if member exists, create if not
          let { data: member, error: memberSelectError } = await supabaseServer
            .from('members')
            .select('id')
            .eq('first_name', competitor.name.split(' ')[0] || competitor.name)
            .eq('last_name', competitor.name.split(' ').slice(1).join(' ') || '')
            .single();

          if (memberSelectError && memberSelectError.code === 'PGRST116') {
            // Member doesn't exist, create it
            const { data: newMember, error: memberInsertError } = await supabaseServer
              .from('members')
              .insert({
                email: `${competitor.name.toLowerCase().replace(/\s+/g, '.')}@temp.scyc.org.uk`,
                first_name: competitor.name.split(' ')[0] || competitor.name,
                last_name: competitor.name.split(' ').slice(1).join(' ') || '',
                membership_type: 'associate',
                joined_date: new Date().toISOString().split('T')[0]
              })
              .select()
              .single();

            if (memberInsertError) {
              results.errors.push(`Failed to create member ${competitor.name}: ${memberInsertError.message}`);
              continue;
            }

            member = newMember;
            results.membersCreated++;
          } else if (memberSelectError) {
            results.errors.push(`Error checking member ${competitor.name}: ${memberSelectError.message}`);
            continue;
          }

          // Create race result
          const { error: resultError } = await supabaseServer
            .from('race_results')
            .insert({
              race_id: results.raceId,
              boat_id: boat.id,
              sailor_name: competitor.name,
              sail_number: competitor.sailNumber,
              division: competitor.division,
              finish_position: competitor.place,
              points: competitor.total || competitor.nett || competitor.place,
              status: competitor.status === 'DNC' ? 'dnc' : 'finished'
            });

          if (resultError) {
            results.errors.push(`Failed to create result for ${competitor.name}: ${resultError.message}`);
          } else {
            results.resultsCreated++;
          }

        } catch (competitorError) {
          results.errors.push(`Error processing competitor ${competitor.name}: ${competitorError}`);
        }
      }

      // Return success response with summary
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Race results imported successfully',
          summary: {
            raceId: results.raceId,
            boatsCreated: results.boatsCreated,
            membersCreated: results.membersCreated,
            resultsCreated: results.resultsCreated,
            totalCompetitors: raceData.competitors.length,
            errors: results.errors
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } catch (dbError) {
      // If race was created but other operations failed, we might want to clean up
      console.error('Database operation failed:', dbError);
      
      return new Response(
        JSON.stringify({
          error: 'Database operation failed',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error',
          partialResults: results
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Import confirmation error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to import race results',
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