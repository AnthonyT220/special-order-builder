import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

serve(async (req) => {
  // ✅ Handle preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('OK', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { templateId, selections, userId } = await req.json();

  if (!templateId || !selections || !userId) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers
    });
  }

  const { data: template, error: templateError } = await supabase
    .from('product_templates')
    .select('vendor_id, stressless_style_id')
    .eq('id', templateId)
    .single();

  if (templateError || !template) {
    return new Response(JSON.stringify({ error: 'Template lookup failed' }), {
      status: 500,
      headers
    });
  }

  const { data: style } = await supabase
    .from('stressless_styles')
    .select('name')
    .eq('id', template.stressless_style_id)
    .single();

  const styleName = style?.name || selections['Style'] || 'Unknown';
  const base = selections['Base'];
  const size = selections['Size'];
  let skuParts = [];

  try {
    const { data: prefixRow } = await supabase
      .from('sku_code_prefixes')
      .select('code')
      .eq('vendor_id', template.vendor_id)
      .eq('style', styleName)
      .eq('base', base)
      .eq('size', size)
      .single();

    if (!prefixRow?.code) throw new Error('No prefix match found');
    skuParts.push(prefixRow.code);
  } catch (err) {
    return new Response(JSON.stringify({
      error: 'Failed to lookup SKU prefix',
      detail: {
        vendor_id: template.vendor_id,
        style: styleName,
        base,
        size
      }
    }), {
      status: 400,
      headers
    });
  }

  const fieldsInOrder = ['Type of Cover', 'Color', 'Leg Color', 'Wood Color', 'Battery'];

  const { data: availableOptions } = await supabase
    .from('product_options')
    .select('name')
    .eq('stressless_style_id', template.stressless_style_id);

  const validFieldNames = availableOptions.map(o => o.name);

  console.log('🧪 Final fieldsInOrder:', fieldsInOrder);
  console.log('🧪 selections:', selections);
  console.log('🧪 validFieldNames:', validFieldNames);

  for (const field of fieldsInOrder) {
    if (!validFieldNames.includes(field)) continue;

    const value = selections[field];
    if (!value) continue;

    const { data: codeRow } = await supabase
      .from('sku_codes')
      .select('code')
      .eq('option_name', field)
      .eq('value', value)
      .single();

    skuParts.push(codeRow?.code || '00');
  }

  const fullSku = skuParts.join('');

  const sorted = Object.entries(selections).sort(([a], [b]) => a.localeCompare(b));
  const raw = JSON.stringify(sorted);
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const skuHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  const { data: existing } = await supabase
    .from('special_order_configs')
    .select('id, sku_hash')
    .eq('sku_hash', skuHash)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ sku: fullSku, reused: true }), {
      headers
    });
  }

  const { data: created, error } = await supabase
    .from('special_order_configs')
    .insert([{ template_id: templateId, options_json: selections, sku_hash: skuHash, created_by: userId }])
    .select('id')
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers
    });
  }

  return new Response(JSON.stringify({ sku: fullSku, reused: false }), {
    headers
  });
});
