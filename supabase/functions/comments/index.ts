import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const featureId = url.searchParams.get('feature_id');
      
      if (!featureId) {
        return new Response(JSON.stringify({ error: 'feature_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: comments, error } = await supabaseClient
        .from('feature_comments')
        .select('*')
        .eq('feature_id', featureId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching comments:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ comments }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      if (!user) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { comment_text, feature_id, feature_coordinates, feature_geometry } = await req.json();

      if (!comment_text || !feature_id) {
        return new Response(JSON.stringify({ error: 'comment_text and feature_id are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: comment, error } = await supabaseClient
        .from('feature_comments')
        .insert({
          comment_text,
          feature_id,
          feature_coordinates,
          feature_geometry,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating comment:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Trigger sentiment analysis for Pro users
      try {
        const { data: subscription } = await supabaseClient
          .from('user_subscriptions')
          .select('tier')
          .eq('user_id', user.id)
          .single();

        if (subscription?.tier === 'pro') {
          // Call sentiment analysis function
          await supabaseClient.functions.invoke('analyze-sentiment', {
            body: { comment_id: comment.id, comment_text }
          });
        }
      } catch (sentimentError) {
        console.log('Sentiment analysis error (non-blocking):', sentimentError);
      }

      return new Response(JSON.stringify({ comment }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in comments function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});