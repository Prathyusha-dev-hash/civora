import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { AuthorityDashboardMetrics } from './components/AuthorityDashboardMetrics';
import { WorkOrderQueue } from './components/WorkOrderQueue';
import { WorkOrderDetailModal } from './components/WorkOrderDetailModal';
import { AuthorityService } from '../../services';
import { useLanguage } from '../../context/useLanguage';

export function AuthorityPortal() {
  const { t } = useLanguage();
  const [workOrders, setWorkOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');

  // Selected order for detailed modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchWorkOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const orders = await AuthorityService.getWorkOrders();
      setWorkOrders(orders);
    } catch (err) {
      setError(err.message || 'Failed to retrieve department work order queue.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    AuthorityService.getWorkOrders()
      .then((orders) => {
        if (isMounted) {
          setWorkOrders(orders);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to retrieve department work order queue.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOrderUpdated = (updatedOrder) => {
    setWorkOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    );
    setSelectedOrder(updatedOrder);
  };

  return (
    <div className="space-y-8">
      {/* Authority Portal Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-white dark:bg-[#2D3C49] p-6 sm:p-8 rounded-2xl border border-[#E1E7EE] dark:border-[#40515F] shadow-2xs transition-colors duration-150">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2E4A62] dark:text-[#F2F5F8] tracking-tight">
              {t('authority.title')}
            </h1>
            <Badge variant="primary" size="md">{t('authority.badge')}</Badge>
          </div>
          <p className="text-base sm:text-lg text-[#64748B] dark:text-[#B7C3CE] max-w-3xl leading-relaxed">
            {t('authority.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap shrink-0">
          <Button
            type="button"
            variant="outline"
            size="md"
            loading={isLoading}
            icon={<RefreshCw className="w-5 h-5" />}
            onClick={fetchWorkOrders}
          >
            {t('authority.syncQueue')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 sm:p-5 bg-[#C74949]/10 text-[#C74949] dark:text-[#E56B6B] border border-[#C74949]/30 dark:border-[#E56B6B]/30 rounded-2xl text-sm sm:text-base flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#C74949] dark:text-[#E56B6B] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <AuthorityDashboardMetrics workOrders={workOrders} />

      {/* Main Work Order Queue */}
      {isLoading ? (
        <div className="bg-white dark:bg-[#2D3C49] rounded-2xl p-12 border border-[#E1E7EE] dark:border-[#40515F]">
          <LoadingSpinner label="Retrieving prioritized work order queue..." />
        </div>
      ) : (
        <WorkOrderQueue
          workOrders={workOrders}
          selectedOrderId={selectedOrder?.id}
          onSelectOrder={(order) => setSelectedOrder(order)}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          filterPriority={filterPriority}
          onFilterPriorityChange={setFilterPriority}
        />
      )}

      {/* Inspection Modal */}
      {selectedOrder && (
        <WorkOrderDetailModal
          workOrder={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onOrderUpdated={handleOrderUpdated}
        />
      )}
    </div>
  );
}

export default AuthorityPortal;
