import { useEffect, useState } from 'react';
import Link from 'next/link';
import supabase from '../utils/supabaseClient';

export default function Home() {
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    supabase.from('vendors').select('id, name').then(({ data }) => {
      if (data) setVendors(data);
    });
  }, []);

  useEffect(() => {
    if (!selectedVendor) return;

    supabase
      .from('product_templates')
      .select('category')
      .eq('vendor_id', selectedVendor)
      .then(({ data }) => {
        const uniqueCategories = [...new Set(data?.map(item => item.category))];
        setCategories(uniqueCategories);
      });
  }, [selectedVendor]);

  useEffect(() => {
    if (!selectedVendor || !selectedCategory) return;

    const fetchTemplates = async () => {
      setIsLoadingTemplates(true);

      const { data } = await supabase
        .from('product_templates')
        .select('id, name, category')
        .eq('vendor_id', selectedVendor)
        .eq('category', selectedCategory);

      setTemplates(data || []);
      setIsLoadingTemplates(false);
    };

    fetchTemplates();
  }, [selectedVendor, selectedCategory]);

  
  return (
    <div className="p-6 space-y-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold">Start a Special Order</h1>
      
      {/* Vendor Dropdown */}
      <div>
        <label className="block font-medium mb-2">Select a Vendor:</label>
        <select
          value={selectedVendor}
          onChange={(e) => {
            setSelectedVendor(e.target.value);
            setSelectedCategory('');
            setTemplates([]);
          }}
          className="w-full border p-2 rounded"
        >
          <option value="">-- Choose a vendor --</option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.name}
            </option>
          ))}
        </select>
      </div>

      {/* Category Dropdown */}
      {categories.length > 0 && (
        <div>
          <label className="block font-medium mb-2">Select a Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="">-- Choose a category --</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      )}

      {/* Templates */}
      {isLoadingTemplates ? (
        <p className="text-gray-500">Loading templates...</p>
      ) : templates.length > 0 ? (
        <div>
          <h2 className="font-semibold mb-2">Available Products:</h2>
          <ul className="space-y-2">
            {templates.map((template) => (
              <li key={template.id}>
                <Link href={`/configurator/${template.id}`} className="text-blue-600 underline">
                  {template.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : selectedCategory ? (
        <p className="text-gray-500">No templates found for this selection.</p>
      ) : null}
    </div>
  );
}