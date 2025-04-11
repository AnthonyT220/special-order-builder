// rearranged function order for correct usage
import React, { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';
import { generateSpecPdf } from '../utils/generateSpecPdf';
import { useRouter } from 'next/router';

function SpecialOrderConfigurator({ templateId }) {
  const [options, setOptions] = useState([]);
  const [selections, setSelections] = useState({});
  const [autoFilledFields, setAutoFilledFields] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [templateDetails, setTemplateDetails] = useState({ description: '', image: '', logo: '' });
  const [dependencies, setDependencies] = useState([]);
  const router = useRouter();

  const isValueAllowed = (option, val, context = selections) => {
    const isChild = dependencies.some(dep => dep.child_option_id === option.id);
    if (!isChild) return true;
    const relevantDeps = dependencies.filter(dep => dep.child_option_id === option.id);
    return relevantDeps.some(dep => {
      const parentOption = options.find(o => o.id === dep.parent_option_id);
      const selectedParentValue = context[parentOption?.name];
      return selectedParentValue === dep.parent_value && dep.child_value === val;
    });
  };

  const shouldRenderOption = (option) => {
    const isChild = dependencies.some(dep => dep.child_option_id === option.id);
    if (!isChild) return true;
    return option.values.some(val => isValueAllowed(option, val));
  };

  const handleChange = (optionName, value) => {
    setSelections(prev => {
      const updated = { ...prev, [optionName]: value };
      const autoFilled = [];

      options.forEach(option => {
        const validValues = option.values.filter(val => isValueAllowed(option, val, updated));
        if (validValues.length === 1 && !updated[option.name]) {
          updated[option.name] = validValues[0];
          autoFilled.push(option.name);
        }
      });

      // Remove invalid fields from selections based on visible options
      const validOptionNames = options.filter(shouldRenderOption).map(opt => opt.name);
      for (const key of Object.keys(updated)) {
        if (!validOptionNames.includes(key)) {
          delete updated[key];
        }
      }

      setAutoFilledFields(autoFilled);
      return updated;
    });
  };

  useEffect(() => {
    async function fetchOptions() {
      const { data: template, error: templateError } = await supabase
        .from('product_templates')
        .select('name, stressless_style_id, description, image_url, vendors (logo_url)')
        .eq('id', templateId)
        .single();

      if (templateError || !template?.stressless_style_id) {
        console.error('Template error or missing style ID');
        return;
      }

      setTemplateName(template.name);
      setTemplateDetails({
        description: template.description,
        image: template.image_url,
        logo: template.vendors?.logo_url || ''
      });

      const { data: rawOptions } = await supabase
        .from('product_options')
        .select('id, name, type')
        .eq('stressless_style_id', template.stressless_style_id)
        .order('sort_order', { ascending: true });

      const valuesMap = {};
      for (const opt of rawOptions) {
        const { data: values } = await supabase
          .from('product_option_values')
          .select('value')
          .eq('option_id', opt.id);

        valuesMap[opt.id] = values.map(v => v.value);
      }

      const formatted = rawOptions.map(opt => ({
        ...opt,
        values: valuesMap[opt.id] || []
      }));

      setOptions(formatted);

      const { data: dependencyData } = await supabase
        .from('product_option_dependencies')
        .select('*')
        .in('parent_option_id', rawOptions.map(o => o.id));

      setDependencies(dependencyData || []);
    }

    fetchOptions();
  }, [templateId]);

  const handleSubmit = async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      const tokenRes = await supabase.auth.getSession();
      const access_token = tokenRes?.data?.session?.access_token;

      console.log("🧪 Final selections going to backend:", selections);


      const res = await fetch('https://lwogqebhtvxcpnceifhh.functions.supabase.co/generate-special-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`
        },
        body: JSON.stringify({
          templateId,
          selections,
          userId: user?.id ?? '00000000-0000-0000-0000-000000000000'
        })
      });

      const result = await res.json();

      if (!res.ok) {
        console.error('Backend error:', result.error || 'Unknown error');
        alert(`Error submitting order: ${result.error}`);
        return;
      }

      alert(`Special Order submitted! SKU: ${result.sku}`);

      await generateSpecPdf({
        templateName,
        selections,
        sku: result.sku,
        createdAt: new Date().toISOString(),
        description: templateDetails.description,
        imageUrl: templateDetails.image,
        logoUrl: templateDetails.logo
      });

      router.push(`/confirmation?sku=${result.sku}`);
    } catch (err) {
      console.error('Request failed:', err);
      alert('Something went wrong submitting your order.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <h2 className="text-3xl font-bold text-center mb-6">Build Your {templateName}</h2>

      {templateDetails.image && (
        <div className="flex justify-center">
          <img src={templateDetails.image} alt={templateName} className="w-[200px] h-[200px] object-contain rounded shadow" />
        </div>
      )}

      {templateDetails.description && (
        <p className="text-center text-gray-700 max-w-2xl mx-auto">{templateDetails.description}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {options.filter(shouldRenderOption).map(option => (
          <div key={option.id} className="flex flex-col">
            <label className="font-semibold mb-1 text-sm text-gray-700">
              {option.name}
              {autoFilledFields.includes(option.name) && (
                <span className="ml-2 text-xs text-blue-500">(auto-selected)</span>
              )}
            </label>

            {option.type === 'dropdown' && (
              <select
                value={selections[option.name] || ''}
                onChange={e => handleChange(option.name, e.target.value)}
                className={`border p-2 rounded ${autoFilledFields.includes(option.name) ? 'bg-blue-50 border-blue-300' : ''}`}
              >
                <option value="">Select...</option>
                {option.values.filter(val => isValueAllowed(option, val)).map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            )}

            {option.type === 'radio' && (
              <div className="space-y-1">
                {option.values.filter(val => isValueAllowed(option, val)).map(val => (
                  <label key={val} className="inline-flex items-center space-x-2">
                    <input
                      type="radio"
                      name={option.name}
                      value={val}
                      checked={selections[option.name] === val}
                      onChange={() => handleChange(option.name, val)}
                    />
                    <span>{val}</span>
                    {autoFilledFields.includes(option.name) && (
                      <span className="text-xs text-blue-500">(auto)</span>
                    )}
                  </label>
                ))}
              </div>
            )}

            {option.type === 'color_swatch' && (
              <div className="flex gap-2 flex-wrap py-2">
                {option.values.filter(val => isValueAllowed(option, val)).map(val => (
                  <button
                    key={val}
                    title={val}
                    className={`rounded-full border-4 shadow-md cursor-pointer transition-transform duration-150 ${
                      selections[option.name] === val
                        ? 'border-blue-600 ring-2 ring-blue-300 scale-105'
                        : 'border-gray-300'
                    } ${autoFilledFields.includes(option.name) ? 'bg-blue-50' : ''}`}
                    style={{ backgroundColor: val, width: '48px', height: '48px' }}
                    onClick={() => handleChange(option.name, val)}
                  />
                ))}
              </div>
            )}

            {option.type === 'boolean' && (
              <label className="inline-flex items-center mt-1">
                <input
                  type="checkbox"
                  checked={selections[option.name] || false}
                  onChange={e => handleChange(option.name, e.target.checked)}
                  className="mr-2"
                />
                Enable
              </label>
            )}
          </div>
        ))}
      </div>

      {options.length > 0 && (
        <div className="text-center">
          <button
            onClick={handleSubmit}
            className="mt-8 px-6 py-3 bg-blue-600 text-white text-lg font-medium rounded shadow hover:bg-blue-700 transition"
          >
            Submit Special Order
          </button>
        </div>
      )}
    </div>
  );
}

export default SpecialOrderConfigurator;
