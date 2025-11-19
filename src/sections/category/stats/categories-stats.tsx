import React from "react";
import { Pie, Cell, Tooltip, PieChart } from "recharts";

import { Box, Typography } from "@mui/material";

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
    // Aggregate stats for products and services
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const productCategories = categories?.filter(cat => cat.type === 'product') || [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const serviceCategories = categories?.filter(cat => cat.type === 'service') || [];

    // Count total categories by type
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const totalCategoryCounts = {
        products: categories?.filter(cat => cat.type === 'product').length || 0,
        services: categories?.filter(cat => cat.type === 'service').length || 0
    };

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