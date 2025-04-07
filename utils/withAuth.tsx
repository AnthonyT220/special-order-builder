import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from './supabaseClient';

export default function withAuth(Component: any) {
  return function AuthenticatedComponent(props: any) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setAuthenticated(true);
        } else {
          router.push('/login');
        }
        setLoading(false);
      });
    }, []);

    if (loading) return <p className="p-4 text-gray-500">Checking auth...</p>;

    return <Component {...props} />;
  };
}
