import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
const calculateMonthlyTrends = (docs: any[], months: string[]): number[] => {
  const monthCounts: { [key: string]: number } = {};
  months.forEach(month => { monthCounts[month] = 0; });

  docs.forEach((doc) => {
    const data = doc.data();
    const createdAt = convertToDate(data.createdAt);
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
      return;
    }

    const fetchAllData = async () => {
      setError(null);
      setLoading(true);
      try {
        // TODO: Replace with API call
        // const response = await fetch('/api/analytics/overview');
        // const data = await response.json();
        
        // Temporarily disabled - Firestore removed
        // const [usersSnap, businessesSnap, productsSnap, servicesSnap] = await Promise.all([
        //   getDocs(usersCollection),
        //   getDocs(businessesCollection),
        //   getDocs(productsCollection),
        //   getDocs(servicesCollection)
        // ]);
        
        // Placeholder data until API migration
        const usersSnap = { size: 0, docs: [] };
        const businessesSnap = { size: 0, docs: [] };
        const productsSnap = { size: 0, docs: [] };
        const servicesSnap = { size: 0, docs: [] };

        // Get counts
        const userCount = usersSnap.size;
        const businessCount = businessesSnap.size;
        const productCount = productsSnap.size;
        const serviceCount = servicesSnap.size;

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

        const usersTrends = calculateMonthlyTrends(usersSnap.docs, months);
        const productsTrends = calculateMonthlyTrends(productsSnap.docs, months);
        const servicesTrends = calculateMonthlyTrends(servicesSnap.docs, months);
        const businessesTrends = calculateMonthlyTrends(businessesSnap.docs, months);

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

        // Calculate gender distribution
        let maleCount = 0;
        let femaleCount = 0;
        usersSnap.docs.forEach((doc) => {
          const userData = doc.data();
          const gender = userData.gender?.toLowerCase();
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

        // Combine products and services views
        [...productsSnap.docs, ...servicesSnap.docs].forEach((doc) => {
          const data = doc.data();
          const createdAt = convertToDate(data.createdAt);
          const views = data.total_views || 0;
          
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

      } catch (err: any) {
        console.error('Error fetching data:', err);
        const errorMessage = err?.code === 'permission-denied' 
          ? 'Permission denied. Please check Firestore security rules or contact administrator.'
          : err?.message || 'Failed to fetch analytics data. Please try again.';
        setError(errorMessage);
      }
    };
    fetchAllData();
  }, [user, loading]);

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
          Hi, Welcome back {user?.email} 👋
        </Typography>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
        Hi, Welcome back {user?.email} 👋
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

      </Grid>
    </DashboardContent>
  );
}
