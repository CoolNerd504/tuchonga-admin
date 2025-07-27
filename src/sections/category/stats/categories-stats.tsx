import React from "react";
import { Box, Grid, Typography } from "@mui/material";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

interface Category {
    id: string;
    name: string;
    description: string;
    type: 'product' | 'service';
  }

interface CategoryStatsProps {
    categories?: Category[];
    categoryAssignments?: Record<string, number>;
}

const CategoryStats: React.FC<CategoryStatsProps> = ({ categories, categoryAssignments = {} }) => {
    // Aggregate stats

    const totalProducts = categories?.length;


    // Generate chart data based on categories
 

    // Aggregate stats for products and services
    const productCategories = categories?.filter(cat => cat.type === 'product') || [];
    const serviceCategories = categories?.filter(cat => cat.type === 'service') || [];

    // Count categories by type
    const categoryCounts = {
        products: productCategories.length,
        services: serviceCategories.length
    };

    const totalCategories = categories?.length || 0;

    // Chart data for category distribution
    const chartData = [
        { name: 'Product Categories', value: categoryCounts.products, color: '#FF9B33' },
        { name: 'Service Categories', value: categoryCounts.services, color: '#83D475' }
    ];

    // Generate chart data based on category types
    const typeDistribution = {
        product: productCategories.length,
        service: serviceCategories.length
    };

    // Count categories assigned to products and services
    const assignedCategoryCounts = {
        products: productCategories.length,
        services: serviceCategories.length
    };

    // Chart data for assigned categories
    // const assignedChartData = [
    //     { name: 'Products', value: assignedCategoryCounts.products, color: '#FF9B33' },
    //     { name: 'Services', value: assignedCategoryCounts.services, color: '#83D475' }
    // ];

    // Count total categories by type
    const totalCategoryCounts = {
        products: categories?.filter(cat => cat.type === 'product').length || 0,
        services: categories?.filter(cat => cat.type === 'service').length || 0
    };

    // Chart data for total categories
    const totalChartData = [
        { name: 'Product Categories', value: totalCategoryCounts.products, color: '#FFE381' },
        { name: 'Service Categories', value: totalCategoryCounts.services, color: '#FF9B33' }
    ];

    // Generate chart data based on categories with names
    // Generate separate assignments for products and services
    const productAssignments = categories?.reduce((acc, category) => {
        if (category.type === 'product') {
            acc[category.id] = category;
        }
        return acc;
    }, {} as Record<string, Category>) || {};

    const serviceAssignments = categories?.reduce((acc, category) => {
        if (category.type === 'service') {
            acc[category.id] = category;
        }
        return acc;
    }, {} as Record<string, Category>) || {};

    // Color palette for random assignment
    const colorPalette = [
        '#FF9B33', // orange
        '#83D475', // green
        '#FFE381', // yellow
        '#4CAF50', // dark green
        '#FF5252', // red
        '#7C4DFF', // purple
        '#00BCD4', // cyan
        '#FF4081', // pink
        '#009688', // teal
        '#FFA726', // light orange
        '#66BB6A', // light green
        '#BA68C8'  // light purple
    ];

    // Function to get consistent color from palette
    const getConsistentColor = (index: number) => colorPalette[index % colorPalette.length];

    // Convert to chart data format with consistent colors
    const productChartData = Object.entries(productAssignments).map(([id, category], index) => ({
        name: category.name,
        value: categoryAssignments[id] || 0,
        color: getConsistentColor(index)
    }));

    const serviceChartData = Object.entries(serviceAssignments).map(([id, category], index) => ({
        name: category.name,
        value: categoryAssignments[id] || 0,
        color: getConsistentColor(index + Object.keys(productAssignments).length)
    }));

    return (
        <Box>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {categories?.length || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Total Categories
                </Typography>
            </Box>

            {/* Product Categories Chart */}
            <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>
                    Product Categories ({Object.keys(productAssignments).length})
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <PieChart width={200} height={200}>
                        <Pie
                            data={productChartData}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={80}
                            innerRadius={50}
                            fill="#8884d8"
                            labelLine={false}
                        >
                            {productChartData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {Object.entries(productAssignments).map(([id, category], index) => (
                        <Typography key={id} variant="body2">
                            <Box 
                                component="span" 
                                sx={{ 
                                    color: getConsistentColor(index), 
                                    fontWeight: "bold", 
                                    mr: 1 
                                }}
                            >
                                ●
                            </Box>
                            {category.name} <Box component="span" sx={{ float: "right" }}>
                                {categoryAssignments[id] || 0} assignments
                            </Box>
                        </Typography>
                    ))}
                </Box>
            </Box>

            {/* Service Categories Chart */}
            <Box sx={{ mt: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>
                    Service Categories ({Object.keys(serviceAssignments).length})
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <PieChart width={200} height={200}>
                        <Pie
                            data={serviceChartData}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={80}
                            innerRadius={50}
                            fill="#8884d8"
                            labelLine={false}
                        >
                            {serviceChartData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {Object.entries(serviceAssignments).map(([id, category], index) => (
                        <Typography key={id} variant="body2">
                            <Box 
                                component="span" 
                                sx={{ 
                                    color: getConsistentColor(index + Object.keys(productAssignments).length), 
                                    fontWeight: "bold", 
                                    mr: 1 
                                }}
                            >
                                ●
                            </Box>
                            {category.name} <Box component="span" sx={{ float: "right" }}>
                                {categoryAssignments[id] || 0} assignments
                            </Box>
                        </Typography>
                    ))}
                </Box>
            </Box>
        </Box>
    );
};

export default CategoryStats;