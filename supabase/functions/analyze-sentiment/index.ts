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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { comment_id, comment_text } = await req.json();

    if (!comment_id || !comment_text) {
      return new Response(JSON.stringify({ error: 'comment_id and comment_text are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call OpenAI for sentiment analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analysis expert. Analyze the given text and respond with ONLY a JSON object containing "sentiment" (Positive, Neutral, or Negative) and "confidence" (a number between 0 and 1). No additional text.'
          },
          {
            role: 'user',
            content: `Analyze the sentiment of this comment: "${comment_text}"`
          }
        ],
        max_tokens: 50,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text());
      return new Response(JSON.stringify({ error: 'Failed to analyze sentiment' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    let sentiment_category = 'Neutral';
    let sentiment_confidence = 0.5;

    try {
      const parsedSentiment = JSON.parse(aiResponse);
      sentiment_category = parsedSentiment.sentiment || 'Neutral';
      sentiment_confidence = parsedSentiment.confidence || 0.5;
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      // Fallback: simple keyword-based sentiment
      const text = comment_text.toLowerCase();
      if (text.includes('good') || text.includes('great') || text.includes('excellent') || text.includes('love')) {
        sentiment_category = 'Positive';
        sentiment_confidence = 0.7;
      } else if (text.includes('bad') || text.includes('terrible') || text.includes('hate') || text.includes('awful')) {
        sentiment_category = 'Negative';
        sentiment_confidence = 0.7;
      }
    }

    // Update the comment with sentiment analysis
    const { error: updateError } = await supabaseClient
      .from('feature_comments')
      .update({
        sentiment_category,
        sentiment_confidence,
      })
      .eq('id', comment_id);

    if (updateError) {
      console.error('Error updating comment with sentiment:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      comment_id, 
      sentiment_category, 
      sentiment_confidence 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-sentiment function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});