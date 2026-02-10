import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, platform, prompt, durationSeconds = 5 } = await req.json();

    if (!projectId || !platform || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: projectId, platform, prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Video generation service is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Project not found:', projectError);
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert pending video record
    const { data: pendingVideo, error: insertError } = await supabase
      .from('generated_videos')
      .insert({
        project_id: projectId,
        platform,
        prompt,
        status: 'generating',
        duration_seconds: durationSeconds,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create video record:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create video record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting video generation for project ${projectId}, video ${pendingVideo.id}`);

    const aspectRatio = ['tiktok', 'instagram_reels', 'facebook_reels', 'youtube_shorts'].includes(platform) ? '9:16' : '16:9';

    // Use the correct Gemini API endpoint for video generation
    const MODEL_ID = 'veo-2.0-generate-001';
    const veoResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateVideos?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generateVideoConfig: {
            prompt: prompt,
            aspectRatio: aspectRatio,
            numberOfVideos: 1,
          }
        }),
      }
    );

    if (!veoResponse.ok) {
      const errorText = await veoResponse.text();
      console.error('Veo API error:', veoResponse.status, 'URL:', `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateVideos`, 'Response:', errorText);

      await supabase
        .from('generated_videos')
        .update({ status: 'failed' })
        .eq('id', pendingVideo.id);

      if (veoResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (veoResponse.status === 402 || veoResponse.status === 403) {
        return new Response(
          JSON.stringify({ error: 'API quota exceeded or billing issue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Video generation failed. Your Gemini API key may not have access to the Veo video generation API. Please enable the Veo API in your Google AI Studio billing settings.', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const veoResult = await veoResponse.json();
    console.log('Veo API response:', JSON.stringify(veoResult, null, 2));

    // generateVideos returns a long-running operation
    if (veoResult.name) {
      // Poll for completion (up to 5 minutes)
      let operationResult = veoResult;
      const maxAttempts = 60;
      
      for (let i = 0; i < maxAttempts; i++) {
        if (operationResult.done) break;
        
        // Wait 5 seconds between polls
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const pollResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${operationResult.name}?key=${GEMINI_API_KEY}`
        );
        
        if (!pollResponse.ok) {
          console.error('Poll error:', pollResponse.status);
          continue;
        }
        
        operationResult = await pollResponse.json();
        console.log(`Poll attempt ${i + 1}:`, operationResult.done ? 'done' : 'still processing');
      }

      if (operationResult.done && operationResult.response) {
        const videos = operationResult.response.generatedVideos;
        if (videos && videos.length > 0) {
          const videoData = videos[0].video;
          let videoUrl = null;

          if (videoData?.uri) {
            videoUrl = videoData.uri;
          }

          if (videoUrl) {
            const { data: updatedVideo } = await supabase
              .from('generated_videos')
              .update({ video_url: videoUrl, status: 'completed' })
              .eq('id', pendingVideo.id)
              .select()
              .single();

            return new Response(
              JSON.stringify({ success: true, video: updatedVideo }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      // If we got here, operation didn't complete or no video URL
      if (!operationResult.done) {
        await supabase
          .from('generated_videos')
          .update({ status: 'processing', video_url: operationResult.name })
          .eq('id', pendingVideo.id);

        return new Response(
          JSON.stringify({
            success: true,
            video: { ...pendingVideo, status: 'processing' },
            message: 'Video generation started. It will be ready in a few minutes.',
            operationName: operationResult.name,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Operation done but no video
      const errorMsg = operationResult.error?.message || 'No video generated';
      console.error('Operation completed with error:', errorMsg);
      await supabase
        .from('generated_videos')
        .update({ status: 'failed' })
        .eq('id', pendingVideo.id);

      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unexpected response format
    await supabase
      .from('generated_videos')
      .update({ status: 'failed' })
      .eq('id', pendingVideo.id);

    return new Response(
      JSON.stringify({ error: 'Unexpected API response format', details: veoResult }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Video generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
