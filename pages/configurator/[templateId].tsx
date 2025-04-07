import withAuth from '../../utils/withAuth';
import SpecialOrderConfigurator from '../../components/SpecialOrderConfigurator';
import { useRouter } from 'next/router';

function ConfiguratorPage() {
  const router = useRouter();
  const { templateId } = router.query;

  if (!templateId || typeof templateId !== 'string') {
    return <p className="p-4 text-gray-500">Loading...</p>;
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Build Your Special Order</h2>
      <SpecialOrderConfigurator templateId={templateId} />
    </div>
  );
}

export default withAuth(ConfiguratorPage);
