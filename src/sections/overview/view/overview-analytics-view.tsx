import { useState, useCallback, useEffect } from 'react';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import { getAuth } from 'firebase/auth';
import { _tasks, _posts, _timeline } from 'src/_mock';
import {
  getDocs,
  collection,

} from 'firebase/firestore';
import { DashboardContent } from 'src/layouts/dashboard';

import { AnalyticsNews } from '../analytics-news';
import { AnalyticsTasks } from '../analytics-tasks';
import { AnalyticsOrderTimeline } from '../analytics-order-timeline';
import { AnalyticsCurrentVisits } from '../analytics-current-visits';
import { AnalyticsWebsiteVisits } from '../analytics-website-visits';
import { AnalyticsWidgetSummary } from '../analytics-widget-summary';
import { AnalyticsTrafficBySite } from '../analytics-traffic-by-site';
import { AnalyticsCurrentSubject } from '../analytics-current-subject';
import { AnalyticsConversionRates } from '../analytics-conversion-rates';
import {app , firebaseDB } from '../../../firebaseConfig';

// ----------------------------------------------------------------------
 // Firestore collection reference
 const businessesCollection = collection(firebaseDB, 'businesses');
 const productsCollection = collection(firebaseDB, 'products');
 const servicesCollection = collection(firebaseDB, 'services');
 const usersCollection = collection(firebaseDB, 'users');

export function OverviewAnalyticsView() {
  const auth = getAuth(app);
  console.log("Current User", auth.currentUser?.uid);
  const [counts, setCounts] = useState({
    users: 0,
    businesses: 0,
    products: 0,
    services: 0
  });
  // Get Counts Overview from Firbase DB 
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [usersSnap, businessesSnap, productsSnap, servicesSnap] = await Promise.all([
          getDocs(usersCollection),
          getDocs(businessesCollection),
          getDocs(productsCollection),
          getDocs(servicesCollection)
        ]);

        const userCount = usersSnap.size;
        const businessCount = businessesSnap.size;
        const productCount = productsSnap.size;
        const serviceCount = servicesSnap.size;

        console.log('Total Users:', userCount);
        console.log('Total Businesses:', businessCount);
        console.log('Total Products:', productCount);
        console.log('Total Services:', serviceCount);

        setCounts({
          users: userCount,
          businesses: businessCount,
          products: productCount,
          services: serviceCount
        });
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };
    fetchCounts();
  }, []);

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
        Hi, Welcome back {auth.currentUser?.email} 👋
      </Typography>

      <Grid container spacing={3}>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidgetSummary
            title="Total Users"
            percent={-0.1}
            total={counts.users}
            color="secondary"
            icon={<img alt="icon" src="/assets/icons/glass/ic-glass-users.svg" />}
            chart={{
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
              series: [56, 47, 40, 62, 73, 30, 23, 54],
            }}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidgetSummary
            title="Products"
            percent={2.6}
            total={counts.products}
            icon={<img alt="icon" src="/assets/icons/glass/ic-glass-buy.svg" />}
            chart={{
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
              series: [22, 8, 35, 50, 82, 84, 77, 12],
            }}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidgetSummary
            title="Services"
            percent={2.8}
            total={counts.services}
            color="warning"
            icon={<img alt="icon" src="/assets/icons/glass/ic-glass-buy.svg" />}
            chart={{
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
              series: [40, 70, 50, 28, 70, 75, 7, 64],
            }}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidgetSummary
            title="Total Businesses"
            percent={3.6}
            total={counts.businesses}
            color="error"
            icon={<img alt="icon" src="/assets/icons/glass/ic-glass-message.svg" />}
            chart={{
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
              series: [56, 30, 23, 54, 47, 40, 62, 73],
            }}
          />
        </Grid>

        <Grid xs={12} md={6} lg={4}>
          <AnalyticsCurrentVisits
            title="Users by gender"
            chart={{
              series: [
                { label: 'Male', value: 3500 },
                { label: 'female', value: 2500 },

              ],
            }}
          />
        </Grid>

        <Grid xs={12} md={6} lg={8}>
          <AnalyticsWebsiteVisits
            title="Website visits"
            subheader="(+43%) than last year"
            chart={{
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
              series: [
                { name: 'Team A', data: [43, 33, 22, 37, 67, 68, 37, 24, 55] },
                { name: 'Team B', data: [51, 70, 47, 67, 40, 37, 24, 70, 24] },
              ],
            }}
          />
        </Grid>

      </Grid>
    </DashboardContent>
  );
}
