import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) return;

      const { data, error } = await supabase
        .from('special_order_configs')
        .select(`
          id,
          options_json,
          created_at,
          sku_hash,
          template_id,
          product_templates (
            id,
            name,
            base_price,
            vendor_id,
            vendors (
              id,
              name
            )
          )
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading orders:', error);
      } else {
        setOrders(data);
      }

      setLoading(false);
    }

    fetchOrders();
  }, []);

  function calculateTotal(order) {
    const base = order.product_templates?.base_price || 0;
    let adjustment = 0;

    const selected = order.options_json || {};
    const priceMap = {
      Velvet: 100,
      Leather: 250,
      Large: 100,
      Walnut: 30,
      Acrylic: 50
    };

    Object.values(selected).forEach((val) => {
      adjustment += priceMap[val] || 0;
    });

    return `$${(base + adjustment).toFixed(2)}`;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold mb-4">Your Special Orders</h1>

      {loading ? (
        <p>Loading order history...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500">You haven’t submitted any special orders yet.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="border rounded p-4 shadow">
              <p><strong>SKU:</strong> {order.id}</p>
              <p><strong>Submitted:</strong> {new Date(order.created_at).toLocaleString()}</p>
              <p className="mt-2"><strong>Product:</strong> {order.product_templates?.name || 'Unknown'}</p>
              <p><strong>Vendor:</strong> {order.product_templates?.vendors?.name || 'Unknown'}</p>
              <p className="mt-2 font-semibold text-green-700">
                Total Price: {calculateTotal(order)}
              </p>
              <p><strong>Options:</strong></p>
              <ul className="ml-4 list-disc text-sm text-gray-700">
                {Object.entries(order.options_json || {}).map(([key, val]) => (
                  <li key={key}>
                    {key}: {val}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
