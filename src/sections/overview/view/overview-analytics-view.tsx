import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from 'src/utils/api';

import { Box } from '@mui/material';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { DashboardContent } from 'src/layouts/dashboard';
import { useAuth } from 'src/hooks/use-auth';

import { AnalyticsCurrentVisits } from '../analytics-current-visits';
import { AnalyticsWebsiteVisits } from '../analytics-website-visits';
import { AnalyticsWidgetSummary } from '../analytics-widget-summary';

// ----------------------------------------------------------------------
// TODO: Migrate to Prisma API endpoints
// - GET /api/analytics/overview
// - GET /api/analytics/trends
// Firestore collections removed - use API calls instead

// Helper function to convert Firestore timestamp to Date
const convertToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'string') return new Date(timestamp);
  return null;
};

// Helper function to get month name from date
const getMonthName = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[date.getMonth()];
};

// Helper function to calculate monthly trends
const calculateMonthlyTrends = (items: any[], months: string[]): number[] => {
  // If no items, return array of zeros
  if (!items || items.length === 0) {
    return months.map(() => 0);
  }

  const monthCounts: { [key: string]: number } = {};
  months.forEach(month => { monthCounts[month] = 0; });

  items.forEach((item: any) => {
    // Handle both Firestore doc format and API data format
    const data = item.data ? item.data() : item;
    const createdAt = convertToDate(data?.createdAt);
    if (createdAt) {
      const monthName = getMonthName(createdAt);
      if (monthCounts[monthName] !== undefined) {
        monthCounts[monthName] += 1;
      }
    }
  });

  // Calculate cumulative counts
  let cumulative = 0;
  return months.map(month => {
    cumulative += monthCounts[month];
    return cumulative;
  });
};

// Helper function to calculate percentage change
const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Helper function to get user display name
const getUserDisplayName = (user: any): string => {
  if (user?.firstname) {
    return user.firstname;
  }
  if (user?.fullName) {
    // Extract first name from fullName if firstname is not available
    const firstName = user.fullName.split(' ')[0];
    return firstName;
  }
  if (user?.displayName) {
    return user.displayName;
  }
  if (user?.email) {
    // Extract name from email (part before @)
    return user.email.split('@')[0];
  }
  return 'User';
};

export function OverviewAnalyticsView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [counts, setCounts] = useState({
    users: 0,
    businesses: 0,
    products: 0,
    services: 0
  });

  const [chartData, setChartData] = useState({
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
    users: { series: [0, 0, 0, 0, 0, 0, 0, 0], percent: 0 },
    products: { series: [0, 0, 0, 0, 0, 0, 0, 0], percent: 0 },
    services: { series: [0, 0, 0, 0, 0, 0, 0, 0], percent: 0 },
    businesses: { series: [0, 0, 0, 0, 0, 0, 0, 0], percent: 0 },
  });

  const [genderData, setGenderData] = useState({
    male: 0,
    female: 0,
  });

  const [productTrends, setProductTrends] = useState<{ labels: string[]; values: number[] }>({
    labels: [],
    values: [],
  });

  const [serviceTrends, setServiceTrends] = useState<{ labels: string[]; values: number[] }>({
    labels: [],
    values: [],
  });

  const [productSummary, setProductSummary] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalViews: 0,
    avgViews: 0,
    zeroViews: 0,
    topViewed: [] as { id: string; name: string; views: number }[],
  });

  const [serviceSummary, setServiceSummary] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalViews: 0,
    avgViews: 0,
    zeroViews: 0,
    topViewed: [] as { id: string; name: string; views: number }[],
  });

  const [websiteVisits, setWebsiteVisits] = useState({
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
    series: [{ name: 'Visits', data: [0, 0, 0, 0, 0, 0, 0, 0] }],
  });

  // Wait for authentication state
  // TODO: Migrate to Prisma API
  // Use GET /api/analytics/overview endpoint instead of Firestore
  useEffect(() => {
    // Wait for user to be authenticated before fetching data
    if (!user) {
      console.log('[Overview] Waiting for user authentication...');
      return;
    }

    const fetchAllData = async () => {
      console.log('[Overview] Starting data fetch...');
      setError(null);
      setLoading(true);
      try {
        // Initialize all counts to 0 (will be updated if data exists)
        let userCount = 0;
        let businessCount = 0;
        let productCount = 0;
        let serviceCount = 0;
        let usersData: any[] = [];
        let productsData: any[] = [];
        let servicesData: any[] = [];
        let businessesData: any[] = [];
        
        // Try to fetch analytics overview (may not exist yet)
        try {
          console.log('[Overview] Fetching /api/analytics/overview...');
          const overviewResponse = await apiGet('/api/analytics/overview');
          console.log('[Overview] Overview response:', overviewResponse);
          
          if (overviewResponse.success && overviewResponse.data) {
            userCount = Number(overviewResponse.data.users) || 0;
            businessCount = Number(overviewResponse.data.businesses) || 0;
            productCount = Number(overviewResponse.data.products) || 0;
            serviceCount = Number(overviewResponse.data.services) || 0;
            console.log('[Overview] Counts from overview:', { userCount, businessCount, productCount, serviceCount });
          } else {
            console.log('[Overview] Overview endpoint not available or returned no data, will calculate from individual endpoints');
          }
        } catch (overviewError) {
          console.log('[Overview] Overview endpoint failed (may not exist yet):', overviewError);
          // Continue with individual endpoint fetches
        }
        
        // Fetch detailed data for trends and counts
        // Request high limit to get all items for accurate counts and trends
        console.log('[Overview] Fetching detailed data for trends...');
        const [
          usersResponse,
          businessesResponse,
          productsResponse,
          servicesResponse,
          productTrendsResponse,
          serviceTrendsResponse,
        ] = await Promise.allSettled([
          apiGet('/api/users', { limit: 10000 }), // High limit to get all users
          apiGet('/api/businesses', { limit: 10000 }), // High limit to get all businesses
          apiGet('/api/products', { limit: 10000 }), // High limit to get all products
          apiGet('/api/services', { limit: 10000 }), // High limit to get all services
          apiGet('/api/analytics/products/trends'),
          apiGet('/api/analytics/services/trends'),
        ]);
        
        // Process users response
        if (usersResponse.status === 'fulfilled' && usersResponse.value.success) {
          usersData = Array.isArray(usersResponse.value.data) ? usersResponse.value.data : [];
          // Always prioritize meta.total from API response (most accurate)
          // Fallback to overview count, then array length
          userCount = usersResponse.value.meta?.total ?? userCount ?? usersData.length;
          console.log('[Overview] Users data loaded:', usersData.length, 'items, total:', userCount);
        } else {
          console.log('[Overview] Users endpoint failed or returned no data, using 0');
          usersData = [];
          if (userCount === 0) userCount = 0;
        }
        
        // Process businesses response
        if (businessesResponse.status === 'fulfilled' && businessesResponse.value.success) {
          businessesData = Array.isArray(businessesResponse.value.data) ? businessesResponse.value.data : [];
          // Always prioritize meta.total from API response (most accurate)
          // Fallback to overview count, then array length
          businessCount = businessesResponse.value.meta?.total ?? businessCount ?? businessesData.length;
          console.log('[Overview] Businesses data loaded:', businessesData.length, 'items, total:', businessCount);
        } else {
          console.log('[Overview] Businesses endpoint failed or returned no data, using 0');
          businessesData = [];
          if (businessCount === 0) businessCount = 0;
        }
        
        // Process products response
        if (productsResponse.status === 'fulfilled' && productsResponse.value.success) {
          productsData = Array.isArray(productsResponse.value.data) ? productsResponse.value.data : [];
          // Always prioritize meta.total from API response (most accurate)
          // Fallback to overview count, then array length
          productCount = productsResponse.value.meta?.total ?? productCount ?? productsData.length;
          console.log('[Overview] Products data loaded:', productsData.length, 'items, total:', productCount);
        } else {
          console.log('[Overview] Products endpoint failed or returned no data, using 0');
          productsData = [];
          if (productCount === 0) productCount = 0;
        }
        
        // Process services response
        if (servicesResponse.status === 'fulfilled' && servicesResponse.value.success) {
          servicesData = Array.isArray(servicesResponse.value.data) ? servicesResponse.value.data : [];
          // Always prioritize meta.total from API response (most accurate)
          // Fallback to overview count, then array length
          serviceCount = servicesResponse.value.meta?.total ?? serviceCount ?? servicesData.length;
          console.log('[Overview] Services data loaded:', servicesData.length, 'items, total:', serviceCount);
        } else {
          console.log('[Overview] Services endpoint failed or returned no data, using 0');
          servicesData = [];
          if (serviceCount === 0) serviceCount = 0;
        }

        // Process product trends
        if (productTrendsResponse.status === 'fulfilled' && productTrendsResponse.value.success) {
          const data = productTrendsResponse.value.data;
          setProductTrends({
            labels: data.monthlyAdds.labels,
            values: data.monthlyAdds.values,
          });
          setProductSummary({
            total: data.summary.total,
            active: data.summary.active,
            inactive: data.summary.inactive,
            totalViews: data.summary.totalViews,
            avgViews: data.summary.avgViews,
            zeroViews: data.summary.zeroViews,
            topViewed: data.topViewed || [],
          });
        }

        // Process service trends
        if (serviceTrendsResponse.status === 'fulfilled' && serviceTrendsResponse.value.success) {
          const data = serviceTrendsResponse.value.data;
          setServiceTrends({
            labels: data.monthlyAdds.labels,
            values: data.monthlyAdds.values,
          });
          setServiceSummary({
            total: data.summary.total,
            active: data.summary.active,
            inactive: data.summary.inactive,
            totalViews: data.summary.totalViews,
            avgViews: data.summary.avgViews,
            zeroViews: data.summary.zeroViews,
            topViewed: data.topViewed || [],
          });
        }
        
        console.log('[Overview] Final counts:', { userCount, businessCount, productCount, serviceCount });

        setCounts({
          users: userCount,
          businesses: businessCount,
          products: productCount,
          services: serviceCount
        });

        // Calculate monthly trends (last 8 months)
        const now = new Date();
        const months: string[] = [];
        for (let i = 7; i >= 0; i -= 1) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push(getMonthName(date));
        }

        // Calculate trends from API data
        const usersTrends = calculateMonthlyTrends(usersData, months);
        const productsTrends = calculateMonthlyTrends(productsData, months);
        const servicesTrends = calculateMonthlyTrends(servicesData, months);
        const businessesTrends = calculateMonthlyTrends(businessesData, months);

        // Calculate percentage changes (current month vs previous month)
        const calculatePercent = (trends: number[]) => {
          if (trends.length < 2) return 0;
          const current = trends[trends.length - 1];
          const previous = trends[trends.length - 2];
          return calculatePercentageChange(current, previous);
        };

        setChartData({
          categories: months,
          users: {
            series: usersTrends,
            percent: calculatePercent(usersTrends),
          },
          products: {
            series: productsTrends,
            percent: calculatePercent(productsTrends),
          },
          services: {
            series: servicesTrends,
            percent: calculatePercent(servicesTrends),
          },
          businesses: {
            series: businessesTrends,
            percent: calculatePercent(businessesTrends),
          },
        });

        // Calculate gender distribution from API data
        let maleCount = 0;
        let femaleCount = 0;
        usersData.forEach((userData: any) => {
          const gender = userData?.gender?.toLowerCase();
          if (gender === 'male' || gender === 'm') {
            maleCount += 1;
          } else if (gender === 'female' || gender === 'f') {
            femaleCount += 1;
          }
        });

        setGenderData({
          male: maleCount,
          female: femaleCount,
        });

        // Calculate website visits (using total_views from products and services)
        const visitsByMonth: { [key: string]: number } = {};
        months.forEach(month => { visitsByMonth[month] = 0; });

        // Combine products and services views from API data
        const allItems = [...(productsData || []), ...(servicesData || [])];
        allItems.forEach((item: any) => {
          const data = item.data ? item.data() : item;
          const createdAt = convertToDate(data?.createdAt);
          const views = data?.total_views || 0;
          
          if (createdAt) {
            const monthName = getMonthName(createdAt);
            if (visitsByMonth[monthName] !== undefined) {
              visitsByMonth[monthName] += views;
            }
          }
        });

        // Calculate cumulative visits
        let cumulativeVisits = 0;
        const visitsData = months.map(month => {
          cumulativeVisits += visitsByMonth[month];
          return cumulativeVisits;
        });

        setWebsiteVisits({
          categories: months,
          series: [{ name: 'Visits', data: visitsData }],
        });

        console.log('[Overview] Data fetch completed successfully');
        setLoading(false);
      } catch (err: any) {
        console.error('[Overview] Error fetching data:', err);
        console.error('[Overview] Error details:', {
          message: err?.message,
          code: err?.code,
          stack: err?.stack,
        });
        const errorMessage = err?.code === 'permission-denied' 
          ? 'Permission denied. Please check Firestore security rules or contact administrator.'
          : err?.message || 'Failed to fetch analytics data. Please try again.';
        setError(errorMessage);
        setLoading(false);
      }
    };
    fetchAllData();
  }, [user]);

  // Navigation handlers
  const handleNavigateToUsers = () => {
    navigate('/user');
  };

  const handleNavigateToProducts = () => {
    navigate('/products');
  };

  const handleNavigateToServices = () => {
    navigate('/services');
  };

  const handleNavigateToBusinesses = () => {
    navigate('/business');
  };

  // Show loading state
  if (loading) {
    return (
      <DashboardContent maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  // Show error state
  if (error) {
    return (
      <DashboardContent maxWidth="xl">
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
          Hi, Welcome back {getUserDisplayName(user)} 👋
        </Typography>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
      Hi, Welcome back {getUserDisplayName(user)} 👋
      </Typography>

      <Grid container spacing={3}>
        <Grid xs={12} sm={6} md={3}>
          <Box
            onClick={handleNavigateToUsers}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              },
            }}
          >
            <AnalyticsWidgetSummary
              title="Total Users"
              percent={chartData.users.percent}
              total={counts.users}
              color="secondary"
              icon={<img alt="icon" src="/assets/icons/glass/ic-glass-users.svg" />}
              chart={{
                categories: chartData.categories,
                series: chartData.users.series,
              }}
            />
          </Box>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Box
            onClick={handleNavigateToProducts}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              },
            }}
          >
            <AnalyticsWidgetSummary
              title="Products"
              percent={chartData.products.percent}
              total={counts.products}
              icon={<img alt="icon" src="/assets/icons/glass/ic-glass-buy.svg" />}
              chart={{
                categories: chartData.categories,
                series: chartData.products.series,
              }}
            />
          </Box>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Box
            onClick={handleNavigateToServices}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              },
            }}
          >
            <AnalyticsWidgetSummary
              title="Services"
              percent={chartData.services.percent}
              total={counts.services}
              color="warning"
              icon={<img alt="icon" src="/assets/icons/glass/ic-glass-buy.svg" />}
              chart={{
                categories: chartData.categories,
                series: chartData.services.series,
              }}
            />
          </Box>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Box
            onClick={handleNavigateToBusinesses}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              },
            }}
          >
            <AnalyticsWidgetSummary
              title="Total Businesses"
              percent={chartData.businesses.percent}
              total={counts.businesses}
              color="error"
              icon={<img alt="icon" src="/assets/icons/glass/ic-glass-message.svg" />}
              chart={{
                categories: chartData.categories,
                series: chartData.businesses.series,
              }}
            />
          </Box>
        </Grid>

        {/* <Grid xs={12} md={6} lg={4}>
          <AnalyticsCurrentVisits
            title="Users by gender"
            chart={{
              series: [
                { label: 'Male', value: genderData.male },
                { label: 'Female', value: genderData.female },
              ],
            }}
          />
        </Grid> */}

        {/* <Grid xs={12} md={6} lg={8}>
          <AnalyticsWebsiteVisits
            title="Website visits"
            subheader={websiteVisits.series[0].data.reduce((a, b) => a + b, 0) > 0 
              ? "Based on product and service views" 
              : "No data available"}
            chart={{
              categories: websiteVisits.categories,
              series: websiteVisits.series,
            }}
          />
        </Grid> */}

        <Grid xs={12} md={6} lg={6}>
          <AnalyticsWebsiteVisits
            title="Products – Monthly Adds"
            subheader={`Total: ${productSummary.total} • Active: ${productSummary.active} • Zero views: ${productSummary.zeroViews}`}
            chart={{
              categories: productTrends.labels.length ? productTrends.labels : chartData.categories,
              series: [
                {
                  name: 'Products',
                  data: productTrends.values.length ? productTrends.values : chartData.products.series,
                },
              ],
            }}
          />
        </Grid>

        <Grid xs={12} md={6} lg={6}>
          <AnalyticsWebsiteVisits
            title="Services – Monthly Adds"
            subheader={`Total: ${serviceSummary.total} • Active: ${serviceSummary.active} • Zero views: ${serviceSummary.zeroViews}`}
            chart={{
              categories: serviceTrends.labels.length ? serviceTrends.labels : chartData.categories,
              series: [
                {
                  name: 'Services',
                  data: serviceTrends.values.length ? serviceTrends.values : chartData.services.series,
                },
              ],
            }}
          />
        </Grid>

        <Grid xs={12} md={6} lg={6}>
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Top Products (by views)
            </Typography>
            {productSummary.topViewed.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No product view data yet.
              </Typography>
            ) : (
              productSummary.topViewed.map((p) => (
                <Typography key={p.id} variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{p.name}</span>
                  <span>{p.views} views</span>
                </Typography>
              ))
            )}
          </Box>
        </Grid>

        <Grid xs={12} md={6} lg={6}>
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Top Services (by views)
            </Typography>
            {serviceSummary.topViewed.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No service view data yet.
              </Typography>
            ) : (
              serviceSummary.topViewed.map((s) => (
                <Typography key={s.id} variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{s.name}</span>
                  <span>{s.views} views</span>
                </Typography>
              ))
            )}
          </Box>
        </Grid>

      </Grid>
    </DashboardContent>
  );
}
